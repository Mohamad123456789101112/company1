import "server-only";
import { count } from "drizzle-orm";
import { db, dbReady } from "@/db";
import { courseUnits, courses, lessons, questions, quizzes } from "@/db/schema";

/**
 * Real starter courses, units, YouTube video lessons, and physics quizzes from
 * Eng. Mohamed Fawzi's official YouTube channel (@mohamed.fawzi7645).
 * Inserted once when the courses table is empty so the teacher can edit, reorder,
 * or delete any of them from the Admin dashboard.
 */
export async function ensureDefaultCourses(): Promise<boolean> {
  try {
    await dbReady;
    const [{ c }] = await db.select({ c: count() }).from(courses);
    if (Number(c) > 0) return true;

    // ───────── Course 1: 3rd Secondary Physics 2027 (Chapter 1) ─────────
    const [course3] = await db
      .insert(courses)
      .values({
        title: "فيزياء الصف الثالث الثانوي 2027 – الفصل الأول: التيار الكهربي وقانون أوم وكيرشوف",
        slug: "physics-3sec-2027-ch1",
        description:
          "شرح تفصيلي وشامل للفصل الأول في الفيزياء للصف الثالث الثانوي دفعة 2027 مع البشمهندس محمد فوزي.\n" +
          "نبدأ من فهم الفكرة والأساس العلمي قبل القانون، مع رسومات توضيحية للدوائر الكهربية، وتطبيق عملي وحل كتاب الامتحان خطوة بخطوة حتى تصبح الفيزياء لعبتنا مش عقدتنا.",
        grade: "third_secondary",
        price: 350,
        discountPrice: 250,
        coverImage: "/images/course-3sec.jpg",
        isPublished: true,
        isFree: false,
        isFeatured: true,
        orderIndex: 0,
      })
      .returning();

    const [u3_1, u3_2, u3_3, u3_4] = await db
      .insert(courseUnits)
      .values([
        {
          courseId: course3.id,
          title: "الوحدة الأولى: التيار الكهربي وقانون أوم والمقاومة الكهربية",
          description: "مفهوم التيار الكهربي، شدة التيار، فرق الجهد، قانون أوم، المقاومة النوعية، والطاقة والقدرة الكهربية.",
          orderIndex: 0,
        },
        {
          courseId: course3.id,
          title: "الوحدة الثانية: توصيل المقاومات (التوالي والتوازي)",
          description: "القوانين الأساسية لتوصيل المقاومات، حالات إلغاء المقاومة، طريقة النقاط، وتجزئة التيار والجهد.",
          orderIndex: 1,
        },
        {
          courseId: course3.id,
          title: "الوحدة الثالثة: قانون أوم للدائرة المغلقة",
          description: "العلاقة بين القوة الدافعة الكهربية (VB) وفرق الجهد والمقاومة الداخلية والخارجية مع حل كتاب الامتحان كاملًا.",
          orderIndex: 2,
        },
        {
          courseId: course3.id,
          title: "الوحدة الرابعة: قانونا كيرشوف (الأول والثاني)",
          description: "قانون حفظ الشحنة وقانون بقاء الطاقة (∑V = 0) وتحديد اتجاهات التيار والمسارات والإشارات وحل الدوائر المعقدة.",
          orderIndex: 3,
        },
      ])
      .returning();

    const insertedLessons3 = await db
      .insert(lessons)
      .values([
        // Unit 1
        {
          courseId: course3.id,
          unitId: u3_1.id,
          title: "الدرس الأول: التيار الكهربي وشدة التيار وفرق الجهد – المحاضرة الأولى",
          description: "تأسيس قوي في مفاهيم التيار الكهربي وشدة التيار وفرق الجهد الكهربي مع أمثلة تطبيقية.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=_WSKSh3HfUQ",
          durationMinutes: 47,
          isFreePreview: true,
          isPublished: true,
          orderIndex: 0,
        },
        {
          courseId: course3.id,
          unitId: u3_1.id,
          title: "الدرس الأول: فرق الجهد وقانون أوم والمقاومة النوعية والقدرة الكهربية – المحاضرة الثانية",
          description: "شرح المقاومة النوعية والتوصيلية الكهربية والقدرة والطاقة الكهربية وربط القوانين ببعضها.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=m_S0-aESEnw",
          durationMinutes: 56,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 1,
        },
        {
          courseId: course3.id,
          unitId: u3_1.id,
          title: "حل كتاب الامتحان فيزياء تالتة ثانوي 2027 – الدرس الأول",
          description: "حل وتفسير أسئلة الدرس الأول من كتاب الامتحان خطوة بخطوة.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=RgsdDyOjdps",
          durationMinutes: 30,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 2,
        },
        // Unit 2
        {
          courseId: course3.id,
          unitId: u3_2.id,
          title: "أخيرًا هتفهم التوالي والتوازي! شرح الدرس الثاني كامل",
          description: "شرح القوانين الأساسية لتوصيل المقاومات وحالات إلغاء المقاومة بأسلوب البشمهندس محمد فوزي.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=jVh04Fzv_kY",
          durationMinutes: 52,
          isFreePreview: true,
          isPublished: true,
          orderIndex: 0,
        },
        {
          courseId: course3.id,
          unitId: u3_2.id,
          title: "شرح التوالي والتوازي بطريقة النقاط والحل عليها",
          description: "إتقان طريقة النقاط لتبسيط أعقد الدوائر الكهربية في الامتحان.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=gHdynHNJm44",
          durationMinutes: 37,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 1,
        },
        {
          courseId: course3.id,
          unitId: u3_2.id,
          title: "تجزئة التيار ببساطة – شرح وحل تمارين كتاب الامتحان",
          description: "شرح قوانين تجزئة التيار الكهربي وحل تمارين كتاب الامتحان من السؤال 40 إلى 62.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=yuF0SFAC_4I",
          durationMinutes: 78,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 2,
        },
        {
          courseId: course3.id,
          unitId: u3_2.id,
          title: "حل تمارين التوالي والتوازي – كتاب الامتحان 2027",
          description: "تطبيق عملي وحل تدريبات كتاب الامتحان على توصيل المقاومات.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=Z5mDF6sErZo",
          durationMinutes: 19,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 3,
        },
        // Unit 3
        {
          courseId: course3.id,
          unitId: u3_3.id,
          title: "شرح قانون أوم للدائرة المغلقة – افهمه وحل أي مسألة بسهولة",
          description: "توضيح العلاقة بين القوة الدافعة الكهربية والمقاومة الداخلية والخارجية وشدة التيار.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=GWJa41EBr1k",
          durationMinutes: 37,
          isFreePreview: true,
          isPublished: true,
          orderIndex: 0,
        },
        {
          courseId: course3.id,
          unitId: u3_3.id,
          title: "حل أسئلة قانون أوم للدائرة المغلقة (من 1 إلى 20) – كتاب الامتحان",
          description: "حل أهم أفكار المسائل على قانون أوم للدائرة المغلقة من كتاب الامتحان.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=oMd6kvv6ggo",
          durationMinutes: 33,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 1,
        },
        {
          courseId: course3.id,
          unitId: u3_3.id,
          title: "حل أسئلة قانون أوم للدائرة المغلقة (من 21 إلى 50) – كتاب الامتحان",
          description: "استكمال حل مسائل كتاب الامتحان على قراءة الأميتر والفولتميتر والدائرة المغلقة.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=qyWW1zGJaFc",
          durationMinutes: 61,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 2,
        },
        {
          courseId: course3.id,
          unitId: u3_3.id,
          title: "حل أسئلة قانون أوم للدائرة المغلقة (من 51 للنهاية) – كتاب الامتحان",
          description: "حل مسائل المستويات العليا ونهاية الدرس الثالث من كتاب الامتحان 2027.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=SZogaLb_B6Q",
          durationMinutes: 57,
          isFreePreview: false,
          isPublished: true,
          orderIndex: 3,
        },
        // Unit 4 (Kirchhoff 1 & 2)
        {
          courseId: course3.id,
          unitId: u3_4.id,
          title: "قانون كيرشوف الأول – شرح مبسط ومهم جدًا | البشمهندس محمد فوزي",
          description: "فهم قانون كيرشوف الأول (حفظ الشحنة الكهربية) والعلاقة بين التيارات الداخلة والخارجة عند نقطة التفرع (∑I = 0).",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=3Ds2RXDHi_A",
          durationMinutes: 30,
          isFreePreview: true,
          isPublished: true,
          orderIndex: 0,
        },
        {
          courseId: course3.id,
          unitId: u3_4.id,
          title: "شرح قانون كيرشوف الثاني | فيزياء تالتة ثانوي 2027 | البشمهندس محمد فوزي",
          description:
            "شرح قانون كيرشوف الثاني (قانون بقاء الطاقة) من الأساس، وفهم قاعدة المجموع الجبري لفروق الجهد في مسار مغلق (∑V = 0)، وتحديد اتجاه الدوران وإشارات القوى الدافعة الكهربية وفروق الجهد بثقة ومن غير لخبطة.",
          type: "video",
          videoProvider: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=WVZnXjXW0gs",
          durationMinutes: 40,
          isFreePreview: true,
          isPublished: true,
          orderIndex: 1,
        },
        {
          courseId: course3.id,
          unitId: u3_4.id,
          title: "اختبار إلكتروني على قانوني كيرشوف الأول والثاني",
          description: "امتحان تفاعلي بتصحيح فوري لقياس استيعابك لقانوني كيرشوف والدوائر الكهربية.",
          type: "quiz",
          durationMinutes: 20,
          isFreePreview: true,
          isPublished: true,
          orderIndex: 2,
        },
      ])
      .returning();

    const quizLesson = insertedLessons3.find((l) => l.type === "quiz");
    if (quizLesson) {
      const [kirchhoffQuiz] = await db
        .insert(quizzes)
        .values({
          courseId: course3.id,
          unitId: u3_4.id,
          lessonId: quizLesson.id,
          scope: "lesson",
          title: "اختبار قانوني كيرشوف الأول والثاني – فيزياء 3 ثانوي 2027",
          description: "امتحان إلكتروني على محاضرتي قانون كيرشوف الأول وقانون كيرشوف الثاني للبشمهندس محمد فوزي.",
          durationMinutes: 20,
          passPercent: 60,
          maxAttempts: 3,
          shuffleQuestions: false,
          showAnswers: true,
          isPublished: true,
          requireFullscreen: false,
          antiCheat: false,
        })
        .returning();

      await db.insert(questions).values([
        {
          quizId: kirchhoffQuiz.id,
          text: "يُعرف قانون كيرشوف الثاني علميًا بأنه تطبيق مباشر لقانون:",
          options: ["حفظ الشحنة الكهربية", "بقاء الطاقة", "حفظ كمية التحرك", "أوم للدائرة المفتوحة"],
          correctIndex: 1,
          explanation: "كما شرح البشمهندس محمد فوزي: قانون كيرشوف الأول يعبر عن حفظ الشحنة، بينما قانون كيرشوف الثاني يعبر عن قانون بقاء الطاقة في مسار مغلق.",
          points: 2,
          orderIndex: 0,
        },
        {
          quizId: kirchhoffQuiz.id,
          text: "الصيغة الرياضية لقانون كيرشوف الثاني في أي مسار مغلق هي:",
          options: ["∑I = 0", "∑V = 0 (أو ∑VB = ∑I·R)", "R = ρ·L / A", "P = I²·R"],
          correctIndex: 1,
          explanation: "المجموع الجبري لفروق الجهد الكهربي في مسار مغلق يساوي صفرًا (∑V = 0)، أو المجموع الجبري للقوى الدافعة الكهربية يساوي المجموع الجبري لفروق الجهد (∑VB = ∑I·R).",
          points: 2,
          orderIndex: 1,
        },
        {
          quizId: kirchhoffQuiz.id,
          text: "في الدائرة الموضحة بمحاضرة كيرشوف الثاني: بطاريتان (5V و15V) في نفس الاتجاه ومقاومة داخلية لكل منهما 1Ω، وثلاث مقاومات خارجية (3Ω و2Ω و3Ω) على التوالي. ما شدة التيار الكلي المار في الدائرة؟",
          options: ["1 أمبير", "2 أمبير", "4 أمبير", "5 أمبير"],
          correctIndex: 1,
          explanation: "بما أن البطاريتين في نفس الاتجاه: ∑VB = 15 + 5 = 20V، ومجموع المقاومات الكلية = (3 + 2 + 3) + (1 + 1) = 10Ω، إذن I = 20 / 10 = 2A.",
          points: 2,
          orderIndex: 2,
        },
        {
          quizId: kirchhoffQuiz.id,
          text: "عند نقطة تفرع في دائرة كهربية، إذا كانت التيارات الداخلة للنقطة هي 3A و 5A، وخرج منها تياران أحدهما 2A، فإن التيار الآخر الخارج يساوي:",
          options: ["4 أمبير", "6 أمبير", "8 أمبير", "10 أمبير"],
          correctIndex: 1,
          explanation: "طبقًا لقانون كيرشوف الأول: مجموع التيارات الداخلة = مجموع التيارات الخارجة، إذن 3 + 5 = 2 + I ومنها I = 6A.",
          points: 2,
          orderIndex: 3,
        },
        {
          quizId: kirchhoffQuiz.id,
          text: "في قانون كيرشوف الثاني، الإشارات الموجبة والسالبة الموضوعة على طرفي المقاومة الأومية تدل على:",
          options: ["أقطاب المقاومة الدائمة", "اتجاه دخول التيار (جهد أعلى +) وخروجه (جهد أقل -)", "نوع مادة المقاومة", "قيمة المقاومة الداخلية"],
          correctIndex: 1,
          explanation: "المقاومة ليس لها أقطاب، وإنما الإشارة الموجبة والسالبة تدل فقط على اتجاه دخول التيار وخروجه لتسهيل تطبيق قاعدة الإشارات.",
          points: 2,
          orderIndex: 4,
        },
      ]);
    }

    // ───────── Course 2: 2nd Secondary Physics ─────────
    const [course2] = await db
      .insert(courses)
      .values({
        title: "فيزياء الصف الثاني الثانوي – الشغل والطاقة والحركة الاهتزازية والضوء",
        slug: "physics-2sec-2027",
        description:
          "كورس الفيزياء الشامل للصف الثاني الثانوي مع البشمهندس محمد فوزي – شرح مبسط للشغل والطاقة وقانون بقاء الطاقة، الحركة الاهتزازية والموجية، وخصائص الضوء (الانعكاس والانكسار والتداخل والحيود) مع حل كتاب الامتحان ونماذج الامتحانات الشاملة.",
        grade: "second_secondary",
        price: 280,
        discountPrice: 200,
        coverImage: "/images/course-2sec.jpg",
        isPublished: true,
        isFree: false,
        isFeatured: true,
        orderIndex: 1,
      })
      .returning();

    const [u2_1, u2_2] = await db
      .insert(courseUnits)
      .values([
        {
          courseId: course2.id,
          title: "الوحدة الأولى: الشغل والطاقة وقانون بقاء الطاقة",
          description: "شرح وحل تدريبات كتاب الامتحان على الشغل وطاقة الحركة وطاقة الوضع وقانون بقاء الطاقة.",
          orderIndex: 0,
        },
        {
          courseId: course2.id,
          title: "الوحدة الثانية: الحركة الاهتزازية والموجية والضوء",
          description: "شرح الحركة الاهتزازية والموجية وانعكاس وانكسار وتداخل وحيود الضوء مع حل النماذج العامة.",
          orderIndex: 1,
        },
      ])
      .returning();

    await db.insert(lessons).values([
      {
        courseId: course2.id,
        unitId: u2_1.id,
        title: "شرح درس الشغل – الدرس الأول فيزياء تانية ثانوي",
        description: "شرح مفهوم الشغل الفيزيائي والعوامل المؤثرة عليه وحالات الشغل.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=og2GS6T9g3s",
        durationMinutes: 38,
        isFreePreview: true,
        isPublished: true,
        orderIndex: 0,
      },
      {
        courseId: course2.id,
        unitId: u2_1.id,
        title: "حل أسئلة درس الشغل من كتاب الامتحان",
        description: "حل تدريبات كتاب الامتحان على درس الشغل بالتفصيل.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=ww448WLFY3U",
        durationMinutes: 32,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 1,
      },
      {
        courseId: course2.id,
        unitId: u2_1.id,
        title: "شرح الطاقة – طاقة الحركة وطاقة الوضع",
        description: "شرح تفصيلي لطاقة الحركة وطاقة الوضع والعلاقات البيانية والرياضية بينهما.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=pn3nTLljDhs",
        durationMinutes: 33,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 2,
      },
      {
        courseId: course2.id,
        unitId: u2_1.id,
        title: "حل درس الطاقة من كتاب الامتحان",
        description: "حل مسائل كتاب الامتحان على طاقة الحركة وطاقة الوضع.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=3XoC6V3JPYY",
        durationMinutes: 43,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 3,
      },
      {
        courseId: course2.id,
        unitId: u2_1.id,
        title: "شرح درس قانون بقاء الطاقة",
        description: "فهم قانون بقاء الطاقة الميكانيكية وتطبيقاته في المسائل.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=XiNz9Pm5lFc",
        durationMinutes: 28,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 4,
      },
      {
        courseId: course2.id,
        unitId: u2_1.id,
        title: "حل جميع أسئلة درس قانون بقاء الطاقة من كتاب الامتحان",
        description: "حل شامل لأسئلة كتاب الامتحان على قانون بقاء الطاقة.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=BE7XS4iuU-0",
        durationMinutes: 54,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 5,
      },
      {
        courseId: course2.id,
        unitId: u2_2.id,
        title: "شرح الحركة الاهتزازية – فيزياء الصف الثاني الثانوي",
        description: "شرح مفاهيم الإزاحة وسعة الاهتزازة والزمن الدوري والتردد وتحولات الطاقة في البندول البسيط.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=LmCQ1cgMTEU",
        durationMinutes: 39,
        isFreePreview: true,
        isPublished: true,
        orderIndex: 0,
      },
      {
        courseId: course2.id,
        unitId: u2_2.id,
        title: "حل جميع أسئلة درس الحركة الاهتزازية من كتاب الامتحان",
        description: "تطبيق وحل أسئلة كتاب الامتحان على الحركة الاهتزازية.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=v38d8L1XeGI",
        durationMinutes: 28,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 1,
      },
      {
        courseId: course2.id,
        unitId: u2_2.id,
        title: "حل جميع أسئلة درس الحركة الموجية من كتاب الامتحان",
        description: "حل تفصيلي لجميع مسائل وأسئلة الحركة الموجية.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=vNeL0Ju0gfQ",
        durationMinutes: 70,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 2,
      },
      {
        courseId: course2.id,
        unitId: u2_2.id,
        title: "شرح انعكاس وانكسار الضوء وتداخل وحيود الضوء",
        description: "شرح قوانين الانعكاس والانكسار والتداخل والحيود مع رسومات توضيحية.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=F16Lg7AT5qk",
        durationMinutes: 25,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 3,
      },
      {
        courseId: course2.id,
        unitId: u2_2.id,
        title: "حل نماذج الامتحانات الشاملة – كتاب الامتحان فيزياء 2 ثانوي",
        description: "مراجعة شاملة وحل نماذج امتحانات كتاب الامتحان خطوة بخطوة.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=LXt5HLozdhQ",
        durationMinutes: 33,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 4,
      },
    ]);

    // ───────── Course 3: 1st Secondary Integrated Science & Physics 2027 ─────────
    const [course1] = await db
      .insert(courses)
      .values({
        title: "العلوم المتكاملة والفيزياء – الصف الأول الثانوي 2027",
        slug: "integrated-science-1sec-2027",
        description:
          "شرح منهج العلوم المتكاملة والفيزياء للصف الأول الثانوي 2027 مع البشمهندس محمد فوزي – يشمل الغلاف المائي على كوكب الأرض، الخواص الكيميائية والفيزيائية للماء، والطاقة في النظام البيئي والديناميكا الحرارية.",
        grade: "first_secondary",
        price: 220,
        discountPrice: 150,
        coverImage: "/images/course-1sec.jpg",
        isPublished: true,
        isFree: false,
        isFeatured: true,
        orderIndex: 2,
      })
      .returning();

    const [u1_1] = await db
      .insert(courseUnits)
      .values([
        {
          courseId: course1.id,
          title: "الوحدة الأولى: الغلاف المائي والديناميكا الحرارية",
          description: "شرح الغلاف المائي وخواص الماء وانتقال الطاقة في النظام البيئي.",
          orderIndex: 0,
        },
      ])
      .returning();

    await db.insert(lessons).values([
      {
        courseId: course1.id,
        unitId: u1_1.id,
        title: "الدرس الأول علوم متكاملة: الغلاف المائي على كوكب الأرض",
        description: "شرح مبسط للغلاف المائي ودورة الماء وتوزيع المياه على كوكب الأرض.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=LmsZQVmIa8c",
        durationMinutes: 41,
        isFreePreview: true,
        isPublished: true,
        orderIndex: 0,
      },
      {
        courseId: course1.id,
        unitId: u1_1.id,
        title: "شرح الخواص الكيميائية والفيزيائية للماء – الجزء الأول",
        description: "تفسير الروابط الهيدروجينية والخواص الفريدة لمركب الماء وأهميتها الحيوية.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=DKp7vsWRz-4",
        durationMinutes: 36,
        isFreePreview: true,
        isPublished: true,
        orderIndex: 1,
      },
      {
        courseId: course1.id,
        unitId: u1_1.id,
        title: "الطاقة في النظام البيئي والديناميكا الحرارية",
        description: "شرح انتقال الطاقة في النظام البيئي وقوانين الديناميكا الحرارية.",
        type: "video",
        videoProvider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=U9uamTnLTWk",
        durationMinutes: 14,
        isFreePreview: false,
        isPublished: true,
        orderIndex: 2,
      },
    ]);

    return true;
  } catch (e) {
    console.error("[default-courses] failed to seed default courses:", e);
    return false;
  }
}
