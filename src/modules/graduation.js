/**
 * 毕业学分追踪
 * 对齐吉林大学计算机科学与技术学院 2022 版培养方案（2023 年修订）
 * Source: https://ccst.jlu.edu.cn/info/1058/19966.htm
 *
 * 课程列表参考：
 * - 主干课程：离散数学、程序设计基础、数据结构、算法设计与分析、
 *   计算机组成原理、计算机系统结构、操作系统、编译原理与实现、
 *   数据库系统原理、计算机网络、软件工程
 */
class GraduationTracker {
  constructor() {
    this.templates = {
      cs_2022: {
        name: '计算机科学与技术（2022版）',
        totalCredits: 170,
        note: '2023年修订版，含通识+学科+专业+实践',
        categories: [
          {
            id: 'general_required',
            name: '通识教育必修课',
            required: 38,
            courses: [
              { name: '思想道德与法治', credit: 3 },
              { name: '中国近现代史纲要', credit: 3 },
              { name: '马克思主义基本原理', credit: 3 },
              { name: '毛泽东思想和中国特色社会主义理论体系概论', credit: 5 },
              { name: '习近平新时代中国特色社会主义思想概论', credit: 3 },
              { name: '形势与政策', credit: 2 },
              { name: '大学外语I', credit: 2 },
              { name: '大学外语II', credit: 2 },
              { name: '大学外语III', credit: 2 },
              { name: '大学外语IV', credit: 2 },
              { name: '体育I', credit: 1 },
              { name: '体育II', credit: 1 },
              { name: '体育III', credit: 1 },
              { name: '体育IV', credit: 1 },
              { name: '军事理论', credit: 2 },
              { name: '大学计算机基础', credit: 2 },
              { name: '创新创业基础', credit: 2 },
            ],
          },
          {
            id: 'general_elective',
            name: '通识教育选修课',
            required: 16,
            courses: [],
            note: '含人文社科、自然科学、艺术审美等类',
          },
          {
            id: 'math_physics',
            name: '数理基础课',
            required: 28,
            courses: [
              { name: '数学分析I', credit: 5 },
              { name: '数学分析II', credit: 5 },
              { name: '高等代数I', credit: 4 },
              { name: '高等代数II', credit: 4 },
              { name: '概率论与数理统计', credit: 4 },
              { name: '大学物理I', credit: 3 },
              { name: '大学物理II', credit: 3 },
              { name: '大学物理实验', credit: 1.5 },
            ],
          },
          {
            id: 'major_base',
            name: '学科基础课',
            required: 30,
            courses: [
              { name: '程序设计基础', credit: 3 },
              { name: '离散数学', credit: 4 },
              { name: '数据结构', credit: 4 },
              { name: '数字逻辑电路', credit: 3 },
              { name: '计算机组成原理', credit: 4 },
              { name: '汇编语言程序设计', credit: 2 },
              { name: '算法设计与分析', credit: 3 },
              { name: '计算机系统结构', credit: 3 },
              { name: '操作系统', credit: 4 },
            ],
          },
          {
            id: 'major_core',
            name: '专业核心课',
            required: 20,
            courses: [
              { name: '编译原理与实现', credit: 4 },
              { name: '数据库系统原理', credit: 3 },
              { name: '计算机网络', credit: 3 },
              { name: '软件工程', credit: 3 },
              { name: '人工智能导论', credit: 3 },
              { name: '机器学习', credit: 3 },
            ],
          },
          {
            id: 'major_elective',
            name: '专业选修课',
            required: 14,
            courses: [],
            note: '从计算机图形学、信息安全、嵌入式系统、大数据技术、自然语言处理等课程中选修',
          },
          {
            id: 'practice',
            name: '实践环节',
            required: 24,
            courses: [
              { name: '程序设计综合课', credit: 2 },
              { name: '数据结构课程设计', credit: 2 },
              { name: '计算机组成原理课程设计', credit: 2 },
              { name: '操作系统课程设计', credit: 2 },
              { name: '数据库课程设计', credit: 2 },
              { name: '编译原理课程设计', credit: 2 },
              { name: '认识实习', credit: 1 },
              { name: '生产实习', credit: 3 },
              { name: '毕业设计（论文）', credit: 8 },
            ],
          },
        ],
      },

      // Simplified template for general use
      cs_simple: {
        name: '计算机科学与技术（简版）',
        totalCredits: 170,
        categories: [
          { id: 'general', name: '通识教育课', required: 54, courses: [] },
          { id: 'math', name: '数理基础课', required: 28, courses: [] },
          { id: 'major_base', name: '学科基础课', required: 30, courses: [] },
          { id: 'major_core', name: '专业核心课', required: 20, courses: [] },
          { id: 'major_elective', name: '专业选修课', required: 14, courses: [] },
          { id: 'practice', name: '实践环节', required: 24, courses: [] },
        ],
      },
    };
  }

  getTemplates() {
    return Object.entries(this.templates).map(([id, t]) => ({
      id, name: t.name, totalCredits: t.totalCredits, note: t.note || '',
    }));
  }

  /**
   * Analyze progress against template
   * completedCourses: [{ name, credit }]
   */
  analyze(templateId, completedCourses) {
    const tpl = this.templates[templateId];
    if (!tpl) return null;

    const completedNames = new Set(completedCourses.map(c => c.name));
    const completedCreditMap = {};
    completedCourses.forEach(c => { completedCreditMap[c.name] = parseFloat(c.credit) || 0; });

    const result = tpl.categories.map(cat => {
      const matchedCourses = cat.courses.filter(c => completedNames.has(c.name));
      const matchedCredits = matchedCourses.reduce((s, c) => s + c.credit, 0);

      // Also count credits from completed courses that match by partial name
      let extraCredits = 0;
      if (cat.courses.length === 0) {
        // For open categories (elective), count all completed credits in this bucket
        // This is a rough heuristic
        extraCredits = 0;
      }

      const totalCompleted = matchedCredits + extraCredits;
      const percentage = Math.min(100, Math.round((totalCompleted / cat.required) * 100));

      return {
        id: cat.id,
        name: cat.name,
        required: cat.required,
        completed: Math.round(totalCompleted * 10) / 10,
        percentage,
        completedCourses: matchedCourses.map(c => c.name),
        missingCourses: cat.courses.filter(c => !completedNames.has(c.name)).map(c => `${c.name}(${c.credit}学分)`),
        done: totalCompleted >= cat.required,
        note: cat.note || '',
      };
    });

    const totalCompleted = result.reduce((s, r) => s + r.completed, 0);
    return {
      template: tpl.name,
      totalRequired: tpl.totalCredits,
      totalCompleted: Math.round(totalCompleted * 10) / 10,
      overallPercentage: Math.min(100, Math.round((totalCompleted / tpl.totalCredits) * 100)),
      categories: result,
    };
  }

}

module.exports = { GraduationTracker };
