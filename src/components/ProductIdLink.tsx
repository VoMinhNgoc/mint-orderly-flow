import { Link } from "react-router-dom";

export const ProductIdLink = ({ id }: { id: string }) => (
  <Link
    to={`/products/${id}`}
    className="font-mono text-primary hover:underline underline-offset-2"
  >
    {id}
  </Link>
);
