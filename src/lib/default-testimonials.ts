import "server-only";
import { count } from "drizzle-orm";
import { db, dbReady } from "@/db";
import { testimonials } from "@/db/schema";

/**
 * Starter testimonials with real portrait photos. They are inserted ONCE into the
 * database (only when the table is empty) so the teacher can edit, replace, hide or
 * delete every one of them from admin → آراء الطلاب.
 */
export const DEFAULT_TESTIMONIALS = [
  { name: "محمد أحمد", grade: "third_secondary", role: "طالب – 3 ثانوي", text: "الشرح بسيط ومنظم، والامتحانات الإلكترونية بعد كل حصة خلتني أعرف مستواي أول بأول. الفيزياء بقت أسهل بجد.", stars: 5, avatarUrl: "/images/avatars/student-1.jpg", orderIndex: 0 },
  { name: "سارة محمود", grade: "second_secondary", role: "طالبة – 2 ثانوي", text: "الملخصات والمذكرات وفرت عليا وقت كبير، وممكن أعيد الحصة أكتر من مرة من الموبايل في أي وقت.", stars: 5, avatarUrl: "/images/avatars/student-2.jpg", orderIndex: 1 },
  { name: "يوسف خالد", grade: "third_secondary", role: "طالب – 3 ثانوي", text: "نظام الامتحانات الآمن والتصحيح الفوري خلاني أتدرب زي الامتحان الحقيقي بالظبط، ودرجاتي اتحسنت واضح.", stars: 5, avatarUrl: "/images/avatars/student-3.jpg", orderIndex: 2 },
  { name: "د/ هالة سمير", grade: null, role: "ولية أمر", text: "بتوصلني إشعارات بنتائج الامتحانات ومتابعة المذاكرة، وده خلاني مطمنة إن ابني ماشي صح.", stars: 5, avatarUrl: "/images/avatars/student-4.jpg", orderIndex: 3 },
  { name: "عبدالرحمن علي", grade: "first_secondary", role: "طالب – 1 ثانوي", text: "أول مرة أفهم المتجهات والحركة من غير حفظ – كل قانون بيتربط بمثال من الحياة.", stars: 5, avatarUrl: "/images/avatars/student-5.jpg", orderIndex: 4 },
  { name: "كريم مصطفى", grade: "third_secondary", role: "طالب – 3 ثانوي", text: "المراجعات النهائية والأسئلة على نظام الامتحان الجديد كانت أكتر حاجة فرقت معايا قبل الامتحان.", stars: 5, avatarUrl: "/images/avatars/student-6.jpg", orderIndex: 5 },
] as const;

/** Inserts the defaults when the table is empty. Safe to call on every request (cheap count).
 *  Returns true when the table is reachable and has rows (seeded or already there). */
export async function ensureDefaultTestimonials(): Promise<boolean> {
  try {
    await dbReady;
    const [{ c }] = await db.select({ c: count() }).from(testimonials);
    if (Number(c) > 0) return true;
    await db.insert(testimonials).values(DEFAULT_TESTIMONIALS.map((t) => ({ ...t, isPublished: true })));
    return true;
  } catch {
    /* table may not exist yet during first bootstrap */
    return false;
  }
}
