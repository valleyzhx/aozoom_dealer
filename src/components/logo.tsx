import Image from "next/image"

export function AozoomLogo() {
  return (
    <span className="logo-mark">
      <Image
        src="https://images.aozoomusa.com/public/aozoom_logo.png"
        alt="Aozoom"
        width={148}
        height={34}
        priority
      />
      <span>USA</span>
    </span>
  )
}
