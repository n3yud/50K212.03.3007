import { test, expect, request } from "@playwright/test";
test("Điểm danh chốt ngoại tuyến tự đồng bộ sau khi có mạng", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60000);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  const weekday = new Date(day + "T12:00:00+07:00").getUTCDay();
  test.skip(weekday === 5, "Trung tâm nghỉ Thứ 6.");
  const assistant = await request.newContext({ baseURL });
  async function post(path, data) {
    const r = await assistant.post("/api" + path, { data });
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  }
  await post("/auth/login", { login: "TL01", password: "ApiChecksOnly!2026" });
  const tid = (await (await assistant.get("/api/classes/teachers")).json())[0]
    .id;
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(5)), (n) =>
    String.fromCharCode(65 + (n % 26)),
  ).join("");
  const c = await post("/classes", {
    name: "Kiểm thử ngoại tuyến " + suffix,
    program: "Cơ bản",
    weekday,
    start: "18:00:00",
    end: "19:00:00",
    capacity: 7,
  });
  await post("/classes/" + c.id + "/teacher", { teacherId: tid });
  const last = new Date(day + "T12:00:00+07:00");
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  await post("/classes/" + c.id + "/sessions", {
    from: day,
    to: last.toISOString().slice(0, 10),
  });
  const s = await post("/students", {
    name: "Bé Ngoại Tuyến " + suffix,
    birthDate: Number(day.slice(0, 4)) - 6 + day.slice(4),
    gender: "Nữ",
    parentName: "Phụ Huynh Kiểm Thử",
    phone: "0900000001",
    program: "Cơ bản",
    trialId: null,
  });
  await post("/classes/" + c.id + "/enroll", { studentId: s.id });
  await post("/tuition", { studentId: s.id, month: day.slice(0, 7) });
  const sessions = await (
    await assistant.get("/api/sessions?from=" + day + "&to=" + day)
  ).json();
  const session = sessions.find((x) => x.classId === c.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập tại đây" }).click();
  await page.getByLabel("Tài khoản", { exact: true }).fill("GV01");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("ApiChecksOnly!2026");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const event = page.locator(".calendar-event").filter({ hasText: c.name });
  await event.getByRole("button", { name: "Điểm danh", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Có mặt", exact: true }).click();
  await page
    .getByRole("button", { name: "Chốt điểm danh", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("sẽ gửi lại khi có mạng");
  await context.setOffline(false);
  const teacher = await request.newContext({ baseURL });
  await teacher.post("/api/auth/login", {
    data: { login: "GV01", password: "ApiChecksOnly!2026" },
  });
  await expect
    .poll(
      async () => {
        const r = await teacher.get("/api/sessions/" + session.id + "/roster");
        return (await r.json()).session.closed;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] },
    )
    .toBe(true);
  await assistant.dispose();
  await teacher.dispose();
});
