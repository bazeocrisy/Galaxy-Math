/* Galaxy Math multiplication lessons (Teach mode). Each lesson runs:
   Goal → Explanation → See it (visual demonstration) → Worked example → Guided question → Independent check
   (feedback after each) → Finish.
   Text may use **bold** for key words. Questions: { type: 'number', answer } or { type: 'choice', options, answer }.
   window.GalaxyMultLessons / Node. */
(function (root) {
  'use strict';

  const LESSONS = [
    {
      id: 'equal-groups', title: 'Equal groups',
      objective: 'I can find how many in all when I have equal groups.',
      words: [{ term: 'equal groups', meaning: 'groups that each have the same number of things' }],
      explain: {
        text: ['**Equal groups** means every group has the same number of things.',
          'Here are 4 groups. Each group has 3 stars. Because every group is the same size, you can count by 3s: 3, 6, 9, 12.',
          '4 groups of 3 is 12 in all. That is what multiplication is about: putting equal groups together.'],
        visual: { kind: 'set', items: [
          { visual: { kind: 'groups', groups: 4, size: 3 }, caption: 'Equal groups: 3, 3, 3, 3' },
          { visual: { kind: 'uneven', sizes: [3, 1, 4] }, caption: 'NOT equal groups: 3, 1, 4' }] },
        caption: 'Equal groups: every group has the same number.'
      },
      example: {
        title: 'How many in 5 groups of 2?', visual: { kind: 'groups', groups: 5, size: 2 },
        steps: ['Count the groups: there are **5** groups.', 'Count how many are in one group: **2**.', 'Count by 2s, five times: 2, 4, 6, 8, 10.', '5 groups of 2 is **10** in all.']
      },
      guided: { type: 'number', prompt: 'There are 3 groups of 4. How many are there in all?', visual: { kind: 'groups', groups: 3, size: 4 }, answer: 12,
        hint: 'Count by 4s, three times: 4, 8, …', explain: 'Count by 4s: 4, 8, 12. 3 groups of 4 is 12.' },
      check: [
        { type: 'number', prompt: 'How many are there in all?', visual: { kind: 'groups', groups: 2, size: 5 }, answer: 10,
          explain: '2 groups of 5: count 5, 10. There are 10 in all.' },
        { type: 'choice', prompt: 'Are these equal groups?', visual: { kind: 'uneven', sizes: [2, 3, 2] }, options: ['Yes', 'No'], answer: 'No',
          explain: 'The groups have 2, 3 and 2. They are not all the same size, so they are not equal groups.' },
        { type: 'number', prompt: 'How many are there in all?', visual: { kind: 'groups', groups: 4, size: 5 }, answer: 20,
          explain: '4 groups of 5: count 5, 10, 15, 20. There are 20 in all.' }
      ]
    },
    {
      id: 'repeated-addition', title: 'Repeated addition',
      objective: 'I can write repeated addition as multiplication.',
      words: [{ term: 'repeated addition', meaning: 'adding the same number again and again' },
        { term: 'multiply', meaning: 'a quick way to add equal groups' }],
      explain: {
        text: ['4 groups of 3 means 3 + 3 + 3 + 3. Adding the same number again and again is **repeated addition**.',
          '**Multiplication** is a shortcut for it: 4 × 3 means 4 groups of 3.',
          'On the number line, 4 jumps of 3 land on 3, 6, 9, 12. So 4 × 3 = 12.'],
        visual: { kind: 'jumps', jumps: 4, size: 3 },
        caption: '4 jumps of 3 land on 12, so 4 × 3 = 12.'
      },
      example: {
        title: 'Write 5 + 5 + 5 as multiplication.', visual: { kind: 'jumps', jumps: 3, size: 5 },
        steps: ['Count how many times 5 is added: **3** times.', 'That is 3 groups of 5.', 'Write it as **3 × 5**.', '5 + 5 + 5 = 15, so **3 × 5 = 15**.']
      },
      guided: { type: 'number', prompt: '2 + 2 + 2 + 2 + 2 + 2 = ?', visual: { kind: 'jumps', jumps: 6, size: 2 }, answer: 12,
        hint: 'There are six 2s. Count by 2s six times: 2, 4, 6, …', explain: 'Six jumps of 2 land on 2, 4, 6, 8, 10, 12. 6 × 2 = 12.' },
      check: [
        { type: 'choice', prompt: 'Which multiplication means 4 + 4 + 4?', options: ['4 × 4', '3 × 4', '4 + 3'], answer: '3 × 4',
          explain: '4 is added 3 times, so it is 3 groups of 4: 3 × 4.', visual: { kind: 'jumps', jumps: 3, size: 4 } },
        { type: 'number', prompt: '6 + 6 + 6 + 6 = ?', answer: 24,
          explain: 'Four 6s: 6, 12, 18, 24. 4 × 6 = 24.', visual: { kind: 'jumps', jumps: 4, size: 6 } },
        { type: 'number', prompt: '7 × 2 means 2 + 2 + 2 + 2 + 2 + 2 + 2. What is 7 × 2?', answer: 14,
          explain: 'Seven jumps of 2: 2, 4, 6, 8, 10, 12, 14. 7 × 2 = 14.', visual: { kind: 'jumps', jumps: 7, size: 2 } }
      ]
    },
    {
      id: 'rows-columns', title: 'Rows and columns',
      objective: 'I can count rows and columns.',
      words: [{ term: 'row', meaning: 'a line of things going across ↔' }, { term: 'column', meaning: 'a line of things going up and down ↕' }],
      explain: {
        text: ['A **row** goes across, like a line of seats at a theater.', 'A **column** goes up and down, like the floors of a tall building.',
          'This picture has 3 rows, and each row has 5 dots. It also has 5 columns, and each column has 3 dots.'],
        visual: { kind: 'array', rows: 3, cols: 5, labels: true },
        caption: '3 rows going across, 5 columns going down.'
      },
      example: {
        title: 'Rows and columns in this picture', visual: { kind: 'array', rows: 2, cols: 6, labels: true },
        steps: ['Count the rows going across: **2** rows.', 'Count the dots in one row: **6**.', 'Count the columns going up and down: **6** columns.', '2 rows of 6 is **12** dots in all.']
      },
      guided: { type: 'number', prompt: 'How many rows are there?', visual: { kind: 'array', rows: 4, cols: 3 }, answer: 4,
        hint: 'Rows go across ↔. Count the lines of dots from top to bottom.', explain: 'There are 4 lines going across, so there are 4 rows (with 3 dots in each).' },
      check: [
        { type: 'number', prompt: 'How many columns are there?', visual: { kind: 'array', rows: 3, cols: 6 }, answer: 6,
          explain: 'Columns go up and down ↕. Count them from left to right: there are 6 columns.' },
        { type: 'number', prompt: 'How many dots are in each row?', visual: { kind: 'array', rows: 5, cols: 2 }, answer: 2,
          explain: 'Each row going across has 2 dots. There are 5 rows of 2.' },
        { type: 'number', prompt: 'How many dots are there in all?', visual: { kind: 'array', rows: 3, cols: 4 }, answer: 12,
          explain: '3 rows of 4: count 4, 8, 12. There are 12 dots.' }
      ]
    },
    {
      id: 'arrays', title: 'Multiplication arrays',
      objective: 'I can use an array to multiply.',
      words: [{ term: 'array', meaning: 'things arranged in equal rows and equal columns' }],
      explain: {
        text: ['An **array** puts equal groups into rows. Each row is one group.', '3 rows of 4 is **3 × 4**. In Galaxy Math the first number tells how many rows.',
          'Count by 4s, one row at a time: 4, 8, 12. So 3 × 4 = 12.'],
        visual: { kind: 'array', rows: 3, cols: 4 },
        caption: '3 rows of 4 make 12.'
      },
      example: {
        title: 'What is 4 × 5?', visual: { kind: 'array', rows: 4, cols: 5 },
        steps: ['4 × 5 means **4 rows** with **5** in each row.', 'Count by 5s, one row at a time: 5, 10, 15, 20.', 'The array has 20 dots.', 'So **4 × 5 = 20**.']
      },
      guided: { type: 'number', prompt: '3 × 7 = ?', visual: { kind: 'array', rows: 3, cols: 7 }, answer: 21,
        hint: 'Each row has 7. Count by 7s, one row at a time: 7, 14, …', explain: 'Count by 7s: 7, 14, 21. 3 × 7 = 21.' },
      check: [
        { type: 'number', prompt: '2 × 8 = ?', visual: { kind: 'array', rows: 2, cols: 8 }, answer: 16, explain: '2 rows of 8: 8, 16. 2 × 8 = 16.' },
        { type: 'choice', prompt: 'Which multiplication matches this array?', visual: { kind: 'array', rows: 4, cols: 6 }, options: ['4 + 6', '6 × 6', '4 × 6'], answer: '4 × 6',
          explain: 'There are 4 rows with 6 in each row, so the array shows 4 × 6.' },
        { type: 'number', prompt: '5 × 5 = ?', visual: { kind: 'array', rows: 5, cols: 5 }, answer: 25, explain: 'Count by 5s: 5, 10, 15, 20, 25. 5 × 5 = 25.' }
      ]
    },
    {
      id: 'equations', title: 'Multiplication equations',
      objective: 'I can name the parts of a multiplication equation.',
      words: [{ term: 'factor', meaning: 'a number you multiply' }, { term: 'product', meaning: 'the answer to a multiplication' },
        { term: 'equation', meaning: 'a number sentence with an equals sign (=)' }],
      explain: {
        text: ['In **4 × 3 = 12**, the numbers 4 and 3 are **factors**. 12 is the **product**.',
          'The × sign means "groups of". The = sign means both sides are worth the same amount.',
          'So 4 × 6 = 3 × 8 is true: both sides are worth 24.'],
        visual: { kind: 'set', items: [{ visual: { kind: 'equation', a: 4, b: 3, p: 12 }, caption: 'factor × factor = product' },
          { visual: { kind: 'array', rows: 4, cols: 3 }, caption: '4 rows of 3 = 12' }] },
        caption: 'Both show 4 × 3 = 12.'
      },
      example: {
        title: 'Write an equation for 6 groups of 2.', visual: { kind: 'groups', groups: 6, size: 2 },
        steps: ['How many groups? **6**: that is the first factor.', 'How many in each group? **2**: that is the second factor.', 'Write **6 × 2 = 12**.', '12 is the **product**.']
      },
      guided: { type: 'number', prompt: 'In 5 × 4 = 20, what is the product?', visual: { kind: 'array', rows: 5, cols: 4 }, answer: 20,
        hint: 'The product is the answer you get when you multiply.', explain: '5 and 4 are the factors. The product is the answer: 20.' },
      check: [
        { type: 'choice', prompt: 'In 3 × 9 = 27, which numbers are the factors?', options: ['3 and 9', '9 and 27', '3 and 27'], answer: '3 and 9',
          explain: 'Factors are the numbers being multiplied: 3 and 9. 27 is the product.', explainVisual: { kind: 'equation', a: 3, b: 9, p: 27 } },
        { type: 'number', prompt: 'Find the missing factor: 6 × ? = 18', answer: 3,
          explain: '6 rows of 3 make 18, so the missing factor is 3.', visual: { kind: 'array', rows: 6, cols: 3 } },
        { type: 'number', prompt: 'What is the product of 7 and 5?', answer: 35,
          explain: 'The product of 7 and 5 means 7 × 5. Count by 5s seven times: 5, 10, 15, 20, 25, 30, 35.', visual: { kind: 'array', rows: 7, cols: 5 } }
      ]
    },
    {
      id: 'missing-factors', title: 'Missing factors',
      objective: 'I can find a missing factor.',
      words: [{ term: 'missing factor', meaning: 'a factor that is hiding in an equation, shown by ?' }],
      explain: {
        text: ['Sometimes a factor is hiding: **4 × ? = 12**.', 'Ask: 4 times what number makes 12? Count by 4s until you reach 12: 4, 8, 12.',
          'That took 3 jumps, so the missing factor is **3**. Check: 4 × 3 = 12.'],
        visual: { kind: 'jumps', jumps: 3, size: 4 },
        caption: '3 jumps of 4 land on 12, so 4 × 3 = 12.'
      },
      example: {
        title: 'Find the missing factor: ? × 5 = 30', visual: { kind: 'jumps', jumps: 6, size: 5 },
        steps: ['The ? is the number of groups. Each group has **5**.', 'Count by 5s up to 30: 5, 10, 15, 20, 25, 30.', 'That is **6** jumps.', 'So ? = **6**, because 6 × 5 = 30.']
      },
      guided: { type: 'number', prompt: '3 × ? = 18', answer: 6, big: true,
        hint: 'Count by 3s up to 18 and count your jumps: 3, 6, 9, …', explain: '3, 6, 9, 12, 15, 18 is 6 jumps, so 3 × 6 = 18.' },
      check: [
        { type: 'number', prompt: '? × 4 = 20', answer: 5, explain: 'Count by 4s: 4, 8, 12, 16, 20. That is 5 jumps, so 5 × 4 = 20.', explainVisual: { kind: 'jumps', jumps: 5, size: 4 } },
        { type: 'number', prompt: '7 × ? = 21', answer: 3, explain: '7 × 3 = 21 (3 groups of 7: 7, 14, 21).', explainVisual: { kind: 'array', rows: 7, cols: 3 } },
        { type: 'choice', prompt: 'Which number makes 8 × ? = 32 true?', options: ['3', '4', '24'], answer: '4', explain: '8 × 4 = 32. (8 × 3 = 24, and 8 × 24 is much more than 32.)' }
      ]
    },
    {
      id: 'commutative', title: 'Switch the order',
      objective: 'I can switch the order of the factors and get the same product.',
      words: [{ term: 'commutative property', meaning: 'you can switch the order of the factors and the product stays the same' }],
      explain: {
        text: ['Turn an array on its side and 2 rows of 5 becomes 5 rows of 2.', 'Nothing was added and nothing was taken away, so the total is still 10.',
          'That is the **commutative property**: 2 × 5 = 5 × 2.'],
        visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: 2, cols: 5 }, caption: '2 × 5 = 10' }, { visual: { kind: 'array', rows: 5, cols: 2 }, caption: '5 × 2 = 10' }] },
        caption: 'The same 10 dots, turned on their side.'
      },
      example: {
        title: 'You know 3 × 8 = 24. What is 8 × 3?', visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: 3, cols: 8 }, caption: '3 × 8' }, { visual: { kind: 'array', rows: 8, cols: 3 }, caption: '8 × 3' }] },
        steps: ['Start with **3 × 8 = 24**.', 'Switch the factors: **8 × 3**.', 'The product does not change: **8 × 3 = 24**.', 'Knowing one fact gives you two!']
      },
      guided: { type: 'number', prompt: '6 × 4 = 24. What is 4 × 6?', answer: 24, visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: 6, cols: 4 }, caption: '6 × 4' }, { visual: { kind: 'array', rows: 4, cols: 6 }, caption: '4 × 6' }] },
        hint: 'Switching the order of the factors does not change the product.', explain: 'Both arrays have 24 dots. 4 × 6 = 24.' },
      check: [
        { type: 'number', prompt: '9 × 2 = 18. What is 2 × 9?', answer: 18, explain: 'Switching the factors keeps the product: 2 × 9 = 18.', visual: { kind: 'array', rows: 2, cols: 9 } },
        { type: 'choice', prompt: 'Which is the same as 7 × 3?', options: ['7 + 3', '3 × 7', '7 × 7'], answer: '3 × 7', explain: '3 × 7 uses the same factors in the other order, so it is also 21.' },
        { type: 'number', prompt: '5 × 8 = 40. What is 8 × 5?', answer: 40, explain: 'Same factors, other order: 8 × 5 = 40.', visual: { kind: 'array', rows: 8, cols: 5 } }
      ]
    },
    {
      id: 'fact-families', title: 'Fact families',
      objective: 'I can find the multiplication facts in a fact family.',
      words: [{ term: 'fact family', meaning: 'facts that use the same three numbers' }],
      explain: {
        text: ['3, 4 and 12 make a **fact family**: 3 × 4 = 12 and 4 × 3 = 12.',
          'Division (÷) undoes multiplication. 12 ÷ 3 asks: 3 times what number makes 12? The answer is 4.',
          'So the whole family is 3 × 4 = 12, 4 × 3 = 12, 12 ÷ 3 = 4 and 12 ÷ 4 = 3.',
          'If both factors are the same, like 5 × 5 = 25, the family has just one multiplication fact.'],
        visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: 3, cols: 4 }, caption: '3 × 4 = 12' }, { visual: { kind: 'array', rows: 4, cols: 3 }, caption: '4 × 3 = 12' }] },
        caption: '3 × 4 and 4 × 3 use the same three numbers.'
      },
      example: {
        title: 'The fact family for 2, 6 and 12', visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: 2, cols: 6 }, caption: '2 × 6' }, { visual: { kind: 'array', rows: 6, cols: 2 }, caption: '6 × 2' }] },
        steps: ['The factors are **2** and **6**. The product is **12**.', 'First fact: **2 × 6 = 12**.', 'Switch the factors: **6 × 2 = 12**.', 'Both facts belong to the 2, 6, 12 family.']
      },
      guided: { type: 'number', prompt: 'Fact family 5, 7, 35: 5 × 7 = 35 and 7 × ? = 35', answer: 5,
        hint: 'A fact family uses the same three numbers. Which number is missing?', explain: 'The family is 5, 7 and 35, so 7 × 5 = 35.' },
      check: [
        { type: 'choice', prompt: 'Which fact is in the same family as 4 × 9 = 36?', options: ['9 × 9 = 81', '4 × 4 = 16', '9 × 4 = 36'], answer: '9 × 4 = 36',
          explain: 'The family uses 4, 9 and 36. 9 × 4 = 36 uses the same three numbers.' },
        { type: 'choice', prompt: 'Which three numbers make a multiplication fact family?', options: ['3, 6, 18', '3, 6, 9', '3, 6, 24'], answer: '3, 6, 18',
          explain: '3 × 6 = 18, so 3, 6 and 18 are a fact family. (3 + 6 = 9 is addition, and 3 × 6 is not 24.)', visual: { kind: 'array', rows: 3, cols: 6 } },
        { type: 'number', prompt: '4 × 6 = 24. So 24 ÷ 4 = ?', answer: 6,
          explain: '24 ÷ 4 asks: 4 times what makes 24? 4 × 6 = 24, so 24 ÷ 4 = 6.', explainVisual: { kind: 'groups', groups: 4, size: 6 } }
      ]
    },
    {
      id: 'strategies', title: 'Strategies for 1 to 12',
      objective: 'I can use a strategy to find facts in every times table from 1 to 12.',
      words: [{ term: 'strategy', meaning: 'a smart way to work out an answer' }],
      explain: {
        text: ['You can build hard facts from easy ones. Here 6 × 7 is split into 5 × 7 (purple) and 1 × 7 (pink): 35 + 7 = 42.',
          '**×1** the same number · **×2** double it · **×3** double, then add one more group · **×4** double, then double again · **×5** count by 5s, or half of ×10',
          '**×6** ×5 plus one more group · **×7** ×5 plus ×2 · **×8** double the ×4 fact · **×9** ×10 minus one group · **×10** that many tens (6 × 10 = 60)',
          'Extension: **×11** ×10 plus one more group · **×12** ×10 plus ×2.',
          'Third graders learn to multiply quickly with factors up to 10 (products within 100). The 11s and 12s are an extra challenge.'],
        visual: { kind: 'array', rows: 6, cols: 7, split: 5 },
        caption: '6 × 7 = 5 × 7 + 1 × 7 = 35 + 7 = 42'
      },
      example: {
        title: 'Use the ×10 strategy for 9 × 7.', visual: { kind: 'array', rows: 10, cols: 7, fade: 9 },
        steps: ['Start with an easy fact: **10 × 7 = 70**.', '9 × 7 is one group of 7 less (the faded row).', '70 − 7 = 63.', 'So **9 × 7 = 63**.']
      },
      guided: { type: 'number', prompt: 'Use doubles: 2 × 9 is 9 + 9. What is 2 × 9?', answer: 18, visual: { kind: 'array', rows: 2, cols: 9 },
        hint: 'Double 9 means 9 + 9.', explain: '9 + 9 = 18, so 2 × 9 = 18.' },
      check: [
        { type: 'number', prompt: 'Find 6 × 8. You know 5 × 8 = 40. Add one more group of 8.', answer: 48,
          explain: '5 × 8 = 40, and one more 8 makes 48. 6 × 8 = 48.', visual: { kind: 'array', rows: 6, cols: 8, split: 5 } },
        { type: 'number', prompt: 'Find 4 × 7. Double 7 is 14. Double it again.', answer: 28,
          explain: 'Double 7 is 14, and double 14 is 28. 4 × 7 = 28.', visual: { kind: 'array', rows: 4, cols: 7, split: 2 } },
        { type: 'number', prompt: 'Find 9 × 6. You know 10 × 6 = 60. Take away one group of 6.', answer: 54,
          explain: '10 × 6 = 60, and one group of 6 less is 54. 9 × 6 = 54.', visual: { kind: 'array', rows: 10, cols: 6, fade: 9 } }
      ]
    },
    {
      id: 'word-problems', title: 'Word problems',
      objective: 'I can solve multiplication word problems.',
      words: [{ term: 'each', meaning: 'every single one' }, { term: 'in all / altogether', meaning: 'the total' }],
      explain: {
        text: ['Look for **equal groups** in the story. Ask two questions: How many groups? How many are in each group?',
          'There are 4 tables. Each table has 6 chairs. How many chairs?',
          'Groups: 4 tables. In each group: 6 chairs. 4 × 6 = 24 chairs.'],
        visual: { kind: 'groups', groups: 4, size: 6 },
        caption: '4 tables with 6 chairs each: 4 × 6 = 24 chairs.'
      },
      example: {
        title: 'A garden has 5 rows of flowers with 3 flowers in each row. How many flowers?', visual: { kind: 'array', rows: 5, cols: 3 },
        steps: ['How many groups (rows)? **5**.', 'How many in each row? **3**.', 'Equation: **5 × 3 = ?**', '5 × 3 = **15** flowers.']
      },
      guided: { type: 'number', prompt: 'There are 6 bags. Each bag has 4 apples. How many apples are there in all?', answer: 24,
        hint: '6 groups of 4. Count by 4s six times: 4, 8, 12, …', hintVisual: { kind: 'groups', groups: 6, size: 4 },
        explain: '6 groups of 4: 4, 8, 12, 16, 20, 24. There are 24 apples.', visual: null },
      check: [
        { type: 'choice', prompt: 'Which equation matches: 3 boxes with 7 pencils in each box?', options: ['3 × 7 = 21', '3 + 7 = 10', '7 × 7 = 49'], answer: '3 × 7 = 21',
          explain: '3 groups (boxes) with 7 in each: 3 × 7 = 21.', visual: { kind: 'groups', groups: 3, size: 7 } },
        { type: 'number', prompt: 'A muffin tray has 4 rows with 5 muffins in each row. How many muffins?', answer: 20,
          explain: '4 rows of 5: 5, 10, 15, 20. 4 × 5 = 20 muffins.', visual: { kind: 'array', rows: 4, cols: 5 } },
        { type: 'number', prompt: 'There are 9 cars. Each car has 4 wheels. How many wheels are there?', answer: 36,
          explain: '9 groups of 4: 9 × 4 = 36 wheels. (Strategy: 10 × 4 = 40, minus one group of 4 is 36.)', visual: { kind: 'groups', groups: 9, size: 4 } }
      ]
    },
    {
      id: 'connecting', title: 'Pictures, addition and equations',
      objective: 'I can match pictures, repeated addition and equations that show the same multiplication.',
      words: [{ term: 'represent', meaning: 'to show the same idea in a different way' }],
      explain: {
        text: ['The same multiplication can be shown in many ways. All of these show **3 groups of 5**:',
          'equal groups, an array with 3 rows of 5, the jumps 5 + 5 + 5 on a number line, and the equation **3 × 5 = 15**.'],
        visual: { kind: 'set', items: [
          { visual: { kind: 'groups', groups: 3, size: 5 }, caption: 'Equal groups' },
          { visual: { kind: 'array', rows: 3, cols: 5 }, caption: 'Array' },
          { visual: { kind: 'jumps', jumps: 3, size: 5 }, caption: '5 + 5 + 5' },
          { visual: { kind: 'equation', a: 3, b: 5, p: 15 }, caption: 'Equation' }] },
        caption: 'Four ways to show the same multiplication: 3 × 5 = 15.'
      },
      example: {
        title: 'Show 2 × 6 four ways.', visual: { kind: 'set', items: [{ visual: { kind: 'groups', groups: 2, size: 6 }, caption: 'Groups' }, { visual: { kind: 'array', rows: 2, cols: 6 }, caption: 'Array' }] },
        steps: ['Picture: **2 groups of 6**.', 'Addition: **6 + 6**.', 'Array: **2 rows of 6**.', 'Equation: **2 × 6 = 12**.']
      },
      guided: { type: 'choice', prompt: 'Which addition matches this array?', visual: { kind: 'array', rows: 2, cols: 6 }, options: ['2 + 6', '6 + 6', '2 + 2'], answer: '6 + 6',
        hint: 'Each row is one group. How many are in each row, and how many rows are there?', explain: '2 rows of 6 is 6 + 6 = 12.' },
      check: [
        { type: 'choice', prompt: 'Which equation matches the picture?', visual: { kind: 'groups', groups: 4, size: 2 }, options: ['4 + 2 = 6', '4 × 2 = 8', '2 × 2 = 4'], answer: '4 × 2 = 8',
          explain: '4 groups with 2 in each: 4 × 2 = 8.' },
        { type: 'choice', prompt: 'Which multiplication matches these jumps?', visual: { kind: 'jumps', jumps: 5, size: 3 }, options: ['5 × 3', '3 + 5', '5 × 5'], answer: '5 × 3',
          explain: '5 jumps of 3 is 5 × 3 = 15.' },
        { type: 'number', prompt: 'What product does this array show?', visual: { kind: 'array', rows: 6, cols: 3 }, answer: 18,
          explain: '6 rows of 3: 3, 6, 9, 12, 15, 18. 6 × 3 = 18.' }
      ]
    },
    {
      id: 'check-the-work', title: 'Check the work',
      objective: 'I can check whether an answer is right, and fix it if it is not.',
      words: [{ term: 'check', meaning: 'work it out again, maybe in a different way, to see if an answer is right' }],
      explain: {
        text: ['Everyone makes mistakes. Good mathematicians **check** their work.', 'Leo says 6 × 7 = 48. Check it: 6 × 5 = 30 and 6 × 2 = 12, so 6 × 7 = 30 + 12 = **42**.',
          '48 is really 6 × 8. Leo used one group too many. The right answer is 42.'],
        visual: { kind: 'array', rows: 6, cols: 7, split: 5 },
        caption: '6 × 7 = 30 + 12 = 42'
      },
      example: {
        title: 'Ava says 3 × 4 = 7. Is Ava right?', visual: { kind: 'array', rows: 3, cols: 4 },
        steps: ['Work out 3 × 4 yourself: 4, 8, 12.', 'So 3 × 4 = **12**.', 'Ava got 7: she **added** 3 + 4 instead of multiplying.', 'Ava is not right. 3 × 4 = 12.']
      },
      guided: { type: 'choice', prompt: 'Sam says 5 × 6 = 30. Is Sam right?', options: ['Yes, Sam is right', 'No, 5 × 6 = 35', 'No, 5 × 6 = 11'], answer: 'Yes, Sam is right',
        hint: 'Work it out yourself first: count by 5s, six times.', explain: '5, 10, 15, 20, 25, 30. 5 × 6 = 30, so Sam is right.' },
      check: [
        { type: 'choice', prompt: 'Mia says 4 × 8 = 36. Is Mia right?', options: ['Yes, Mia is right', 'No, 4 × 8 = 32', 'No, 4 × 8 = 12'], answer: 'No, 4 × 8 = 32',
          explain: '4 × 8 = 32. 36 is 4 × 9: Mia used one group of 4 too many.', explainVisual: { kind: 'array', rows: 4, cols: 8 } },
        { type: 'choice', prompt: 'Noah says 2 × 9 = 18. Is Noah right?', options: ['No, 2 × 9 = 11', 'Yes, Noah is right', 'No, 2 × 9 = 20'], answer: 'Yes, Noah is right',
          explain: '2 × 9 is double 9: 9 + 9 = 18. Noah is right.' },
        { type: 'number', prompt: 'Zoe says 7 × 3 = 24. That is not right. What is 7 × 3?', answer: 21,
          explain: '7 × 3 = 21 (count by 7s: 7, 14, 21). 24 would be 8 × 3.', explainVisual: { kind: 'array', rows: 7, cols: 3 } }
      ]
    },
    {
      id: 'times-as-many', title: 'Times as many (challenge)', challenge: true,
      objective: 'I can solve “times as many” problems.',
      words: [{ term: 'times as many', meaning: 'that many equal groups of the first amount' }],
      explain: {
        text: ['Mia has 3 stickers. Ben has **4 times as many**.', "That means Ben has 4 groups the size of Mia's amount: 3, 3, 3 and 3.",
          '4 × 3 = 12, so Ben has 12 stickers.', 'This is a challenge lesson that gets you ready for 4th grade.'],
        visual: { kind: 'compare', times: 4, size: 3, names: ['Mia', 'Ben'] },
        caption: "Ben's amount is 4 of Mia's bars: 4 × 3 = 12."
      },
      example: {
        title: 'Leo has 5 shells. Ava has 3 times as many. How many shells does Ava have?', visual: { kind: 'compare', times: 3, size: 5, names: ['Leo', 'Ava'] },
        steps: ["Leo's amount: **5**.", '3 times as many means **3 groups of 5**.', '3 × 5 = 15.', 'Ava has **15** shells.']
      },
      guided: { type: 'number', prompt: 'Zoe has 2 marbles. Eli has 6 times as many. How many marbles does Eli have?', answer: 12,
        hint: 'Eli has 6 groups of 2.', hintVisual: { kind: 'compare', times: 6, size: 2, names: ['Zoe', 'Eli'] }, explain: '6 groups of 2: 6 × 2 = 12 marbles.' },
      check: [
        { type: 'number', prompt: 'Sam reads 4 books. Ruby reads 2 times as many. How many books does Ruby read?', answer: 8,
          explain: '2 times as many as 4 is 2 × 4 = 8 books.', explainVisual: { kind: 'compare', times: 2, size: 4, names: ['Sam', 'Ruby'] } },
        { type: 'number', prompt: 'Noah has 7 stars. Mia has 5 times as many. How many stars does Mia have?', answer: 35,
          explain: '5 times as many as 7 is 5 × 7 = 35 stars.', explainVisual: { kind: 'compare', times: 5, size: 7, names: ['Noah', 'Mia'] } },
        { type: 'choice', prompt: 'Ava has 6 shells. Leo has 3 times as many. Which shows how many Leo has?', options: ['6 + 3', '3 × 6', '6 − 3'], answer: '3 × 6',
          explain: '3 times as many as 6 is 3 groups of 6: 3 × 6 = 18.' }
      ]
    }
  ];

  const STEPS = ['Goal', 'Explanation', 'See it', 'Worked example', 'Try it together', 'Check yourself', 'Finish'];
  const PASS = 2; // independent-check answers right on the first try (out of 3) to complete a lesson

  function checkLessonAnswer(question, given) {
    if (question.type === 'choice') return given === question.answer;
    return /^\d+$/.test(String(given ?? '')) && Number(given) === question.answer;
  }

  const api = { LESSONS, STEPS, PASS, checkLessonAnswer, getLesson: (id) => LESSONS.find((l) => l.id === id) || null };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyMultLessons = api;
})(this);
