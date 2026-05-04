import { Link } from "react-router-dom";
import { ShoppingCart, ClipboardList, Users, Package } from "lucide-react";
import { Card } from "@/components/ui/card";

const tiles = [
  {
    to: "/cart",
    label: "Shopping Cart",
    desc: "Draft orders ready to process",
    icon: ShoppingCart,
  },
  {
    to: "/processing",
    label: "Processing Orders",
    desc: "Confirm & link customers",
    icon: ClipboardList,
  },
  {
    to: "/customers",
    label: "Customer List",
    desc: "Purchases & payment status",
    icon: Users,
  },
];

const Home = () => {
  return (
    <div className="space-y-10">
      <section className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Order Management
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          A clean, mint-themed workspace for carts, orders, and customers.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {tiles.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full p-8 rounded-3xl border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] hover:-translate-y-1 transition-all">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{label}</h2>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <div className="text-center">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <Package className="h-4 w-4" />
          Manage Product Catalog
        </Link>
      </div>
    </div>
  );
};

export default Home;
