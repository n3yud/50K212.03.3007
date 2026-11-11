import { test, expect } from "@playwright/test";
for (const [login, role, width] of [
  ["QL01", "Quản lý", 1440],
  ["TL01", "Trợ lý", 1440],
  ["GV01", "Giáo viên", 390],
  ["GS01", "Giám sát", 1440],
  ["0900000001", "Phụ huynh", 390],
]) {
  test("Phiên làm việc " + role, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Đăng nhập tại đây" }).click();
    await page.getByLabel("Tài khoản", { exact: true }).fill(login);
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill(process.env.TEST_LOGIN_PASSWORD || "ApiChecksOnly!2026");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.locator(".app-header")).toBeVisible();
    await expect(page.locator(".app-header")).not.toContainText("Đang tải");
    await page.waitForTimeout(500);
    await expect(page.getByRole("alert")).toHaveCount(0);
    if (width === 1440) {
      const nav = page.locator("aside nav button");
      for (let i = 0; i < (await nav.count()); i++) {
        await nav.nth(i).click();
        await page.waitForTimeout(200);
        await expect(page.getByRole("alert")).toHaveCount(0);
      }
    }
    await page.screenshot({
      path: "../artifacts/role-" + login + ".png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
