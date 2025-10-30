import { getTodayJST, getNowJST, formatDateToJST } from "@/lib/utils/date-jst"

console.log("=== JST Utility Test ===")
console.log("")

console.log("System time (UTC):", new Date().toISOString())
console.log("JST time (locale):", new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }))
console.log("")

console.log("getTodayJST():", getTodayJST())
console.log("")

const nowJST = getNowJST()
console.log("getNowJST():", nowJST)
console.log("getNowJST().toISOString():", nowJST.toISOString())
console.log("formatDateToJST(getNowJST()):", formatDateToJST(nowJST))
console.log("")

// Test with UTC midnight scenario (should not affect JST date)
const utcMidnight = new Date("2025-10-31T00:30:00Z")  // JST 09:30
console.log("=== UTC Midnight Test (2025-10-31T00:30:00Z = JST 09:30) ===")
console.log("formatDateToJST(utcMidnight):", formatDateToJST(utcMidnight))
console.log("Expected: 2025-10-31")
console.log("")

// Test with late night JST scenario
const lateNightUTC = new Date("2025-10-30T20:00:00Z")  // JST 2025-10-31 05:00
console.log("=== Late Night Test (2025-10-30T20:00:00Z = JST 2025-10-31 05:00) ===")
console.log("formatDateToJST(lateNightUTC):", formatDateToJST(lateNightUTC))
console.log("Expected: 2025-10-31")
