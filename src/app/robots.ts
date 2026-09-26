export default function Robots() {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
