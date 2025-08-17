// components/Logo.jsx
import Image from "next/image";
export default function Logo({ size = 28 }) {
  return (
     <Image
      src="/brand/logo.png"
      alt="Hey Skol Sister logo"
      width={size}
      height={size}
    />
  );
}
