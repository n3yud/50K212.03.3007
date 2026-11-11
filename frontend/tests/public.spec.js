import { test, expect } from "@playwright/test";
test("Chuyển giao diện sang tiếng Anh", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language / Ngôn ngữ").selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Welcome, parents!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Book a free trial" }).click();
  await expect(
    page.getByLabel("Student's full name", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Language / Ngôn ngữ").selectOption("vi");
  await expect(
    page.getByLabel("Họ và tên học viên", { exact: true }),
  ).toBeVisible();
});
test("Trang chào mừng, đăng ký công khai và đăng nhập hoạt động trên mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chào mừng ba mẹ!" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/welcome-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Đăng ký học thử ngay" }).click();
  await expect(
    page.getByRole("heading", { name: "Đăng ký học thử" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ Thêm bé thứ hai" }).click();
  await expect(page.getByLabel("Họ và tên học viên")).toHaveCount(2);
  await page.getByRole("button", { name: "Bỏ bé thứ hai" }).click();
  await expect(page.getByLabel("Họ và tên học viên")).toHaveCount(1);
  await page.screenshot({
    path: "../artifacts/register-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập tại đây" }).click();
  await page.getByRole("button", { name: "Quên mật khẩu?" }).click();
  await expect(page.getByRole("status")).toContainText("liên hệ Trợ lý");
  await page.getByLabel("Tài khoản", { exact: true }).fill("not-a-user");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.screenshot({
    path: "../artifacts/login-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});
test("Tài nguyên tĩnh Figma không bị thiếu", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chào mừng ba mẹ!" }),
  ).toBeVisible();
  const images = page.locator("img");
  expect(await images.count()).toBeGreaterThan(0);
  for (let i = 0; i < (await images.count()); i++)
    expect(
      await images.nth(i).evaluate((el) => el.complete && el.naturalWidth > 0),
    ).toBe(true);
});
