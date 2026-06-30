import { cookies as nextCookies } from "next/headers"

const AUTH_COOKIE = "_medusa_dealer_jwt"
const CART_COOKIE = "_medusa_dealer_cart_id"

const secureCookie = process.env.NODE_ENV === "production"

export async function getAuthToken() {
  const cookies = await nextCookies()
  return cookies.get(AUTH_COOKIE)?.value
}

type EmptyHeaders = Record<string, never>

export async function getAuthHeaders(): Promise<
  { authorization: string } | EmptyHeaders
> {
  const token = await getAuthToken()

  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function setAuthToken(token: string) {
  const cookies = await nextCookies()

  cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: secureCookie,
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function removeAuthToken() {
  const cookies = await nextCookies()
  cookies.set(AUTH_COOKIE, "", { maxAge: -1, path: "/" })
}

export async function getCartId() {
  const cookies = await nextCookies()
  return cookies.get(CART_COOKIE)?.value
}

export async function setCartId(cartId: string) {
  const cookies = await nextCookies()

  cookies.set(CART_COOKIE, cartId, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: secureCookie,
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function removeCartId() {
  const cookies = await nextCookies()
  cookies.set(CART_COOKIE, "", { maxAge: -1, path: "/" })
}
