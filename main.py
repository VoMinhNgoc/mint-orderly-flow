from fastapi import FastAPI
import mysql.connector
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    # Kiểm tra xem đang chạy trên Render (online) hay dưới máy (local)
    is_online = os.getenv("DB_HOST") is not None
    
    if is_online:
        # Cấu hình bảo mật SSL kiểu đặc biệt dành riêng cho Render + TiDB Cloud
        return mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 4000)),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "mintorder"),
            ssl_verify_cert=False,
            ssl_disabled=False
        )
    else:
        # Cấu hình chạy dưới máy local cũ của Ngọc
        return mysql.connector.connect(
            host="localhost",
            port=3306,
            user="root",
            password="",
            database="mintorder"
        )

# --- KHAI BÁO CẤU TRÚC DỮ LIỆU ---
class Product(BaseModel):
    id: str
    name: str
    base_price: float
    image_url: Optional[str] = None
    description: Optional[str] = None
    tag: Optional[str] = None
    expiry_date: Optional[str] = None  # Thêm dòng này nè

class CartItemModel(BaseModel):
    product_id: str
    product_name: str
    simple_description: Optional[str] = ""
    base_sets: int
    split_sets: int
    units_per_set: int
    product_price: float
    markup_fee: float
    expiry_date: str
    tag: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "Backend is running", "ngrok": "Active"}

# --- API SẢN PHẨM ---
@app.get("/products")
def get_products():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM products")
        products = cursor.fetchall()
        for p in products:
            url = p.get('image_url')
            if url and "github.com" in url:
                url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("/refs/heads/", "/")
                if "?" in url:
                    url = url.split("?")[0]
                p['image_url'] = url
            p['base_price'] = float(p.get('base_price', 0)) if p.get('base_price') else 0.0
        return products
    finally:
        cursor.close()
        conn.close()

@app.post("/products")
async def add_product(product: Product):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        sql = """INSERT INTO products (id, name, base_price, image_url, long_description, tag, expiry_date) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        val = (product.id, product.name, product.base_price, 
               product.image_url, product.description, product.tag, product.expiry_date)
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Lỗi SQL khi lưu: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.put("/products/{product_id}")
async def update_product(product_id: str, product: Product):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        sql = """UPDATE products 
                 SET name=%s, base_price=%s, image_url=%s, long_description=%s, tag=%s, expiry_date=%s 
                 WHERE id=%s"""
        val = (product.name, product.base_price, product.image_url, 
               product.description, product.tag, product.expiry_date, product_id)
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success", "message": "Cập nhật sản phẩm thành công!"}
    except Exception as e:
        print(f"Lỗi Update: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.delete("/products/{product_id}")
def delete_product(product_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        cursor.close()
        conn.close()

@app.get("/products/{product_id}")
def get_product_detail(product_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
        if product:
            if product.get('image_url') and "github.com" in product['image_url']:
                product['image_url'] = product['image_url'].replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").split("?")[0]
            product['base_price'] = float(product['base_price'])
            product['description'] = product.get('long_description', '')
        return product
    finally:
        cursor.close()
        conn.close()

# --- API TAGS ---
temporary_tags = set()

@app.get("/tags")
def get_tags():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT tag FROM products WHERE tag IS NOT NULL AND tag != ''")
        db_tags = {row[0] for row in cursor.fetchall()}
        all_tags = db_tags.union(temporary_tags)
        return [{"id": t, "name": t} for t in all_tags]
    finally:
        cursor.close()
        conn.close()

@app.post("/tags")
async def add_tag(tag_data: dict):
    tag_name = tag_data.get("name")
    if tag_name:
        temporary_tags.add(tag_name)
    return {"id": tag_name, "name": tag_name}

# --- API GIỎ HÀNG ---
@app.get("/cart")
def get_cart():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM cart")
        items = cursor.fetchall()
        for item in items:
            item['product_price'] = float(item['product_price']) if item.get('product_price') else 0.0
            item['markup_fee'] = float(item['markup_fee']) if item.get('markup_fee') else 0.0
        return items
    except Exception as e:
        print(f"Lỗi lấy giỏ hàng: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

@app.post("/cart")
async def add_to_cart(item: CartItemModel):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        sql = """INSERT INTO cart 
                 (product_id, product_name, simple_description, base_sets, split_sets, 
                  units_per_set, product_price, markup_fee, expiry_date, tag) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        val = (item.product_id, item.product_name, item.simple_description, 
               item.base_sets, item.split_sets, item.units_per_set, 
               item.product_price, item.markup_fee, item.expiry_date, item.tag)
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success", "message": "Đã thêm vào giỏ hàng"}
    except Exception as e:
        print(f"Lỗi thêm giỏ hàng: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.delete("/cart/{item_id}")
def delete_cart_item(item_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cart WHERE id = %s", (item_id,))
        conn.commit()
        return {"status": "success", "message": "Đã xóa mục khỏi giỏ hàng"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

# --- API ĐƠN HÀNG (PROCESSING) ---

@app.post("/proceed-order")
async def proceed_order(data: dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cart_id = data.get('cart_id') # Lấy ID món hàng từ web gửi lên
        
        if not cart_id:
            return {"status": "error", "message": "Thiếu mã giỏ hàng!"}

        # 1. Lấy đúng món hàng đó từ bảng cart
        cursor.execute("SELECT * FROM cart WHERE id = %s", (cart_id,))
        item = cursor.fetchone()
        
        if not item:
            return {"status": "error", "message": "Không tìm thấy món hàng trong giỏ!"}

        # 2. Chuẩn bị các con số để lưu sang bảng orders
        price = float(item.get('product_price', 0))
        markup = float(item.get('markup_fee', 0))
        split = int(item.get('split_sets', 1))
        total = (price + markup) * split
        
        # 3. Lưu ĐẦY ĐỦ các cột vào bảng orders
        sql = """INSERT INTO orders 
                 (product_id, product_name, product_price, markup_fee, split_sets, total_amount, status) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        val = (item['product_id'], item['product_name'], price, markup, split, total, 'Processing')
        
        cursor.execute(sql, val)
        
        # 4. Xóa món đó khỏi giỏ hàng
        cursor.execute("DELETE FROM cart WHERE id = %s", (cart_id,))
        
        conn.commit()
        return {"status": "success", "message": f"Đã chốt '{item['product_name']}'!"}
    except Exception as e:
        print(f"Lỗi: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.get("/orders")
def get_orders():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        # 1. Lấy danh sách đơn hàng gốc
        cursor.execute("SELECT * FROM orders ORDER BY id DESC")
        orders = cursor.fetchall()
        
        for o in orders:
            # Ép kiểu dữ liệu để tránh lỗi hiển thị
            o['product_price'] = float(o.get('product_price', 0))
            o['markup_fee'] = float(o.get('markup_fee', 0))
            o['split_sets'] = int(o.get('split_sets', 0))
            
            # --- ĐOẠN QUAN TRỌNG NHẤT Ở ĐÂY ---
            # Python sẽ đếm tổng số lượng đã bán cho khách trong bảng order_assignments
            cursor.execute(
                "SELECT SUM(quantity_bought) as total FROM order_assignments WHERE order_id = %s", 
                (o['id'],)
            )
            res = cursor.fetchone()
            
            # Gán giá trị đếm được vào biến assigned_quantity để gửi về cho web
            o['assigned_quantity'] = int(res['total']) if res['total'] else 0
            # ---------------------------------

            # Lấy chi tiết tên khách để hiện ở cột bên phải
            cursor.execute("SELECT * FROM order_assignments WHERE order_id = %s", (o['id'],))
            o['assignments'] = cursor.fetchall()
            
        return orders
    finally:
        cursor.close()
        conn.close()

@app.put("/cart/{item_id}")
async def update_cart_item(item_id: int, item: CartItemModel):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        sql = """UPDATE cart 
                 SET base_sets=%s, split_sets=%s, units_per_set=%s, 
                     product_price=%s, markup_fee=%s 
                 WHERE id=%s"""
        val = (item.base_sets, item.split_sets, item.units_per_set, 
               item.product_price, item.markup_fee, item_id)
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success"}
    finally:
        cursor.close()
        conn.close()

@app.get("/customers")
def get_customers():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        # Kiểm tra kỹ các tên cột: customer_name, product_name, total_billed...
        query = """
            SELECT 
                customer_name as name, 
                contact_info, 
                GROUP_CONCAT(DISTINCT product_name SEPARATOR ', ') as purchased_products,
                GROUP_CONCAT(DISTINCT tracking_number SEPARATOR ', ') as tracking_numbers,
                SUM(total_billed) as total_spent,
                SUM(markup_earned) as total_profit
            FROM order_assignments
            GROUP BY customer_name, contact_info
        """
        cursor.execute(query)
        customers = cursor.fetchall()
        return customers
    except Exception as e:
        print(f"Lỗi: {e}") # Xem lỗi này ở màn hình Terminal đen
        return []
    finally:
        cursor.close()
        conn.close()

# --- API GÁN KHÁCH HÀNG (Dùng cho nút 'Buy' ở Processing) ---
@app.post("/assign-customer")
async def assign_customer(data: dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Lấy đúng 6 thông tin cơ bản
        order_id = int(data.get('order_id', 0))
        product_name = data.get('product_name', '')
        customer_name = data.get('customer_name', '')
        contact_info = data.get('contact_info', '')
        quantity = int(data.get('quantity_bought', 1))
        markup = float(data.get('markup_earned', 0))
        total = float(data.get('total_billed', 0))

        # 2. Câu lệnh SQL chỉ có 6 cột (BỎ product_id)
        sql = """INSERT INTO order_assignments 
                 (order_id, product_name, customer_name, quantity_bought, markup_earned, total_billed) 
                 VALUES (%s, %s, %s, %s, %s, %s)"""
        
        # 3. Biến val cũng chỉ có 6 món tương ứng
        val = (order_id, product_name, customer_name, quantity, markup, total)
        
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success", "message": "Đã ghi nhận khách hàng!"}
    except Exception as e:
        print(f"Lỗi khi lưu khách: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

# --- API LẤY DANH SÁCH KHÁCH HÀNG (Dùng cho trang Customers) ---
@app.get("/customers-report")
def get_customers_report():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        # Tính toán tiền lời (Profit) và Tổng chi tiêu dựa trên order_assignments
        query = """
            SELECT 
                customer_name, 
                contact_info, 
                GROUP_CONCAT(DISTINCT tracking_number SEPARATOR ', ') as all_tracking,
                SUM(quantity_bought) as total_items,
                SUM(total_billed) as total_spent,
                SUM(markup_earned) as total_profit
            FROM order_assignments
            GROUP BY customer_name, contact_info
        """
        cursor.execute(query)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@app.delete("/orders/{order_id}")
def delete_order(order_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # CHỈ XÓA ĐƠN HÀNG, KHÔNG ĐỤNG CHẠM GÌ ĐẾN KHÁCH HÀNG
        cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        
        conn.commit()
        return {"status": "success", "message": "Đã xóa đơn hàng thành công!"}
    except Exception as e:
        print(f"Lỗi khi xóa đơn hàng: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.put("/assign-customer/{assignment_id}")
async def update_assignment(assignment_id: int, data: dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Ép kiểu số để đảm bảo an toàn cho database
        quantity = int(data.get('quantity_bought', 1))
        markup = float(data.get('markup_earned', 0))
        total = float(data.get('total_billed', 0))

        # Câu lệnh SQL để cập nhật thông tin đã gán
        sql = """UPDATE order_assignments 
                 SET customer_name = %s, contact_info = %s, quantity_bought = %s, 
                     tracking_number = %s, markup_earned = %s, total_billed = %s
                 WHERE id = %s"""
        val = (
            data.get('customer_name'), 
            data.get('contact_info'), 
            quantity, 
            data.get('tracking_number'), 
            markup, 
            total, 
            assignment_id
        )
        
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success", "message": "Cập nhật thông tin khách hàng thành công!"}
    except Exception as e:
        print(f"Lỗi update: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

# Thêm đoạn này vào cuối file main.py
@app.patch("/customers/{name}")
async def update_customer_overall(name: str, data: dict):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Cập nhật tất cả đơn hàng của người có tên này
        sql = """UPDATE order_assignments 
                 SET contact_info = %s, tracking_number = %s 
                 WHERE customer_name = %s"""
        val = (data.get('contact_info'), data.get('tracking_number'), name)
        cursor.execute(sql, val)
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.delete("/customers/{name}")
def delete_customer_by_name(name: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        
        # 1. Lấy thông tin các đơn gán của khách này trước khi xóa
        cursor.execute("SELECT order_id, quantity_bought FROM order_assignments WHERE customer_name = %s", (name,))
        assignments = cursor.fetchall()
        
        for asm in assignments:
            order_id = asm['order_id']
            qty_bought = int(asm['quantity_bought'] or 0)
            
            # Dựa vào order_id để tìm mã sản phẩm (product_id) bên bảng orders
            cursor.execute("SELECT product_id FROM orders WHERE id = %s", (order_id,))
            order_info = cursor.fetchone()
            
            if order_info:
                p_id = order_info['product_id']
                
                # 2. ĐÃ ĐỔI THÀNH 'stock' THEO ĐÚNG CƠ SỞ DỮ LIỆU CỦA NGỌC
                cursor.execute(
                    "UPDATE products SET stock = GREATEST(0, stock - %s) WHERE id = %s",
                    (qty_bought, p_id)
                )

            # 3. Cập nhật giảm số lượng split_sets trong bảng orders
            update_sql = """
                UPDATE orders 
                SET split_sets = split_sets - %s,
                    total_amount = (product_price + markup_fee) * (split_sets - %s)
                WHERE id = %s
            """
            cursor.execute(update_sql, (qty_bought, qty_bought, order_id))
            
            # 4. 🔥 ĐOẠN SỬA CHÍ MẠNG: Nếu khách cuối cùng đặt mua sạch đơn hàng
            cursor.execute("SELECT split_sets FROM orders WHERE id = %s", (order_id,))
            order = cursor.fetchone()
            if order and order['split_sets'] <= 0:
                if order_info:
                    p_id = order_info['product_id']
                    # Ép thẳng tồn kho của sản phẩm về bằng 0 trong bảng products
                    cursor.execute("UPDATE products SET stock = 0 WHERE id = %s", (p_id,))
                
                # Xóa đơn hàng bên bảng orders đi như cũ của Ngọc để sạch Processing
                cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))

        # 5. Cuối cùng mới xóa dữ liệu khách này trong bảng order_assignments
        cursor.execute("DELETE FROM order_assignments WHERE customer_name = %s", (name,))
        
        conn.commit()
        return {"status": "success", "message": "Đã hoàn thành khách và cập nhật kho hàng thành công!"}
    except Exception as e:
        print(f"Lỗi khi hoàn thành khách hàng: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.delete("/assignments/{assignment_id}")
def delete_single_assignment(assignment_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Chỉ xóa duy nhất 1 dòng gán khách dựa trên ID gán của dòng đó
        sql = "DELETE FROM order_assignments WHERE id = %s"
        cursor.execute(sql, (assignment_id,))
        
        conn.commit()
        return {"status": "success", "message": "Đã hủy gán khách hàng này!"}
    except Exception as e:
        print(f"Lỗi khi xóa khách gán: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()