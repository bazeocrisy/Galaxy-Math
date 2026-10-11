/* Galaxy Math division lessons (Teach). Same shape and steps as the multiplication lessons:
   Goal → Explanation → See it → Worked example → Try it together → Check yourself → Finish.
   Exact division throughout; remainders appear only in the last lesson, labelled as an extension.
   Text may use **bold**. Questions: { type: 'number', answer } or { type: 'choice', options, answer }.
   window.GalaxyDivLessons / Node. */
(function (root) {
  'use strict';
  const share = (total, groups, dealt = 0) => ({ kind: 'share', total, groups, dealt });
  const grp = (total, size, circled = 0) => ({ kind: 'grouping', total, size, circled });
  const arr = (rows, cols) => ({ kind: 'array', rows, cols });
  const groups = (g, n) => ({ kind: 'groups', groups: g, size: n });
  const set = (...items) => ({ kind: 'set', items: items.map(([visual, caption]) => ({ visual, caption })) });

  const LESSONS = [
    {
      id: 'what-division-means', title: 'What division means',
      objective: 'I can explain what division means.',
      words: [{ term: 'divide', meaning: 'split a total into equal groups' }],
      explain: {
        text: ['**Division** means splitting a total into **equal** groups.', '12 stars split into 3 equal groups gives 4 stars in each group.',
          'We write it **12 ÷ 3 = 4**. The ÷ sign means “divided by”.'],
        visual: set([share(12, 3), 'Before: 12 stars, 3 groups'], [share(12, 3, 4), 'After: 4 in each group']),
        caption: '12 ÷ 3 = 4'
      },
      example: {
        title: 'Split 10 into 2 equal groups.', visual: share(10, 2, 5),
        steps: ['Start with the total: **10**.', 'Make **2** equal groups.', 'Each group gets **5**.', 'So 10 ÷ 2 = 5.']
      },
      guided: { type: 'number', prompt: 'Split 8 into 2 equal groups. How many are in each group?', visual: share(8, 2), answer: 4,
        hint: 'Deal them out one at a time: one for this group, one for that group…', hintVisual: share(8, 2, 2), explain: '8 ÷ 2 = 4: each group gets 4.' },
      check: [
        { type: 'number', prompt: 'Split 15 into 3 equal groups. How many are in each group?', visual: share(15, 3), answer: 5,
          explain: '15 ÷ 3 = 5: each group gets 5.', explainVisual: share(15, 3, 5) },
        { type: 'choice', prompt: 'Are these equal groups?', visual: { kind: 'uneven', sizes: [3, 3, 2] }, options: ['Yes', 'No'], answer: 'No',
          explain: 'The groups have 3, 3 and 2. Division needs groups that are all the same size.' },
        { type: 'number', prompt: '12 ÷ 4 = ?', visual: share(12, 4), answer: 3, explain: 'Share 12 into 4 equal groups: each gets 3. 12 ÷ 4 = 3.', explainVisual: share(12, 4, 3) }
      ]
    },
    {
      id: 'equal-sharing', title: 'Equal sharing',
      objective: 'I can share a total equally and find how many each group gets.',
      words: [{ term: 'share equally', meaning: 'everyone gets the same amount' }],
      explain: {
        text: ['When you **share**, you know **how many groups** there are.', 'Deal the things out one at a time, like cards, until none are left.',
          'The answer tells **how many in each group**.'],
        visual: share(18, 3, 6),
        caption: '18 shared by 3 friends: 6 each'
      },
      example: {
        title: '20 cookies are shared equally on 4 plates. How many on each plate?', visual: share(20, 4, 5),
        steps: ['Number of groups: **4** plates.', 'Deal 1 cookie to each plate, again and again.', 'When all 20 are dealt, each plate has **5**.', 'So 20 ÷ 4 = 5.']
      },
      guided: { type: 'number', prompt: '24 stickers are shared equally by 6 friends. How many stickers does each friend get?', visual: share(24, 6), answer: 4,
        hint: 'Deal one sticker to each friend at a time.', hintVisual: share(24, 6, 2), explain: '24 ÷ 6 = 4. Check: 6 × 4 = 24.' },
      check: [
        { type: 'number', prompt: '14 apples are shared equally into 2 baskets. How many apples go in each basket?', visual: share(14, 2), answer: 7,
          explain: '14 ÷ 2 = 7. Check: 2 × 7 = 14.', explainVisual: share(14, 2, 7) },
        { type: 'number', prompt: '30 pencils are shared equally by 5 tables. How many pencils does each table get?', visual: share(30, 5), answer: 6,
          explain: '30 ÷ 5 = 6. Check: 5 × 6 = 30.', explainVisual: share(30, 5, 6) },
        { type: 'number', prompt: '16 marbles are shared equally into 4 jars. How many marbles go in each jar?', visual: share(16, 4), answer: 4,
          explain: '16 ÷ 4 = 4. Check: 4 × 4 = 16.', explainVisual: share(16, 4, 4) }
      ]
    },
    {
      id: 'equal-grouping', title: 'Equal grouping',
      objective: 'I can make groups of a size and find how many groups there are.',
      words: [{ term: 'group', meaning: 'a set of things that go together' }],
      explain: {
        text: ['When you **group**, you know **how many go in each group**.', 'Circle groups of that size until nothing is left.',
          'The answer tells **how many groups**.'],
        visual: grp(15, 5, 3),
        caption: '15 in groups of 5: 3 groups'
      },
      example: {
        title: 'A coach has 30 baseballs and puts 5 in each bag. How many bags?', visual: grp(30, 5, 6),
        steps: ['Size of each group: **5** baseballs.', 'Circle 5 baseballs, then 5 more, and so on.', 'You can circle **6** groups.', 'So 30 ÷ 5 = 6 bags.']
      },
      guided: { type: 'number', prompt: 'There are 12 socks. 2 socks make a pair. How many pairs are there?', visual: grp(12, 2), answer: 6,
        hint: 'Circle groups of 2.', hintVisual: grp(12, 2, 2), explain: '12 ÷ 2 = 6 pairs.' },
      check: [
        { type: 'number', prompt: 'There are 20 crayons. Each box holds 4. How many boxes are needed?', visual: grp(20, 4), answer: 5,
          explain: '20 in groups of 4 is 5 groups: 20 ÷ 4 = 5 boxes.', explainVisual: grp(20, 4, 5) },
        { type: 'number', prompt: '18 children line up in teams of 3. How many teams are there?', visual: grp(18, 3), answer: 6,
          explain: '18 ÷ 3 = 6 teams.', explainVisual: grp(18, 3, 6) },
        { type: 'number', prompt: 'There are 24 eggs. Each carton holds 6. How many cartons are needed?', visual: grp(24, 6), answer: 4,
          explain: '24 ÷ 6 = 4 cartons.', explainVisual: grp(24, 6, 4) }
      ]
    },
    {
      id: 'share-or-group', title: 'Sharing or grouping?',
      objective: 'I can tell whether a division problem is sharing or grouping.',
      words: [{ term: 'sharing', meaning: 'you know the number of groups' }, { term: 'grouping', meaning: 'you know how many go in each group' }],
      explain: {
        text: ['Sharing and grouping are both division, and they use the same numbers.', '**Sharing**: 12 shared by 3 friends. How many each? You know the 3 groups.',
          '**Grouping**: 12 put in bags of 3. How many bags? You know there are 3 in each.', '12 ÷ 3 = 4 either way, but the 4 means something different.'],
        visual: set([share(12, 3, 4), 'Sharing: 4 each'], [grp(12, 3, 4), 'Grouping: 4 groups']),
        caption: 'Same division, two meanings'
      },
      example: {
        title: '20 marbles go in bags of 5. Sharing or grouping?', visual: grp(20, 5, 4),
        steps: ['What do we know? There are **5 in each bag**.', 'We know the size of each group, so this is **grouping**.', '20 ÷ 5 = 4.', 'The answer is the number of bags: **4**.']
      },
      guided: { type: 'choice', prompt: '18 cookies are shared by 3 friends. Is this sharing or grouping?', options: ['Sharing', 'Grouping'], answer: 'Sharing',
        hint: 'Do we know the number of groups (friends), or the size of each group?', explain: 'We know there are 3 friends (the number of groups), so it is sharing: 18 ÷ 3 = 6 each.' },
      check: [
        { type: 'choice', prompt: 'A baker puts 24 muffins in boxes of 6. Sharing or grouping?', options: ['Sharing', 'Grouping'], answer: 'Grouping',
          explain: 'We know there are 6 in each box (the size of each group), so it is grouping.' },
        { type: 'choice', prompt: '35 stickers are shared by 5 children. Sharing or grouping?', options: ['Sharing', 'Grouping'], answer: 'Sharing',
          explain: 'We know there are 5 children (the number of groups), so it is sharing.' },
        { type: 'number', prompt: 'A baker puts 24 muffins in boxes of 6. How many boxes?', answer: 4, explain: '24 ÷ 6 = 4 boxes.', explainVisual: grp(24, 6, 4) }
      ]
    },
    {
      id: 'div-equations', title: 'Division equations',
      objective: 'I can name the parts of a division equation and read the ÷ sign and the division bracket.',
      words: [{ term: 'dividend', meaning: 'the total you start with' }, { term: 'divisor', meaning: 'the number you divide by' },
        { term: 'quotient', meaning: 'the answer to a division' }, { term: '÷ and the bracket', meaning: 'two ways to write division' }],
      explain: {
        text: ['In **24 ÷ 6 = 4**: 24 is the **dividend**, 6 is the **divisor** and 4 is the **quotient**.',
          'Division can also be written with a **division bracket**. The divisor goes outside, the dividend goes inside, and the quotient goes on top.',
          'Both ways mean the same thing: 24 divided by 6 equals 4.'],
        visual: set([{ kind: 'divEquation', p: 24, d: 6, q: 4 }, 'with the ÷ sign'], [{ kind: 'bracket', dividend: 24, divisor: 6, quotient: 4, labels: true }, 'with a division bracket']),
        caption: 'Two ways to write 24 divided by 6'
      },
      example: {
        title: 'Write 30 ÷ 5 = 6 with a division bracket.', visual: { kind: 'bracket', dividend: 30, divisor: 5, quotient: 6, labels: true },
        steps: ['The divisor **5** goes outside the bracket.', 'The dividend **30** goes inside.', 'The quotient **6** goes on top.', 'It reads: 30 divided by 5 equals 6.']
      },
      guided: { type: 'number', prompt: 'In 35 ÷ 7 = 5, what is the dividend?', answer: 35,
        hint: 'The dividend is the total you start with.', explain: '35 is the dividend, 7 is the divisor and 5 is the quotient.' },
      check: [
        { type: 'choice', prompt: 'In 18 ÷ 3 = 6, which number is the quotient?', options: ['18', '3', '6'], answer: '6',
          explain: 'The quotient is the answer: 6. (18 is the dividend and 3 is the divisor.)', explainVisual: { kind: 'divEquation', p: 18, d: 3, q: 6 } },
        { type: 'choice', prompt: 'Which means the same as this division bracket?', visual: { kind: 'bracket', dividend: 40, divisor: 8 }, options: ['8 ÷ 40', '40 ÷ 8', '40 − 8'], answer: '40 ÷ 8',
          explain: 'The divisor (8) is outside and the dividend (40) is inside, so it means 40 ÷ 8 = 5.', explainVisual: { kind: 'bracket', dividend: 40, divisor: 8, quotient: 5, labels: true } },
        { type: 'choice', prompt: '24 stars are put into 6 equal groups. Which division matches the picture?', visual: groups(6, 4), options: ['24 − 6', '24 ÷ 6', '6 ÷ 24'], answer: '24 ÷ 6',
          explain: 'The total (24) is divided into 6 equal groups: 24 ÷ 6 = 4 in each group.' }
      ]
    },
    {
      id: 'div-arrays', title: 'Arrays and division',
      objective: 'I can use an array to divide.',
      words: [{ term: 'array', meaning: 'things in equal rows and equal columns' }],
      explain: {
        text: ['An array shows division too.', '24 dots in 4 equal rows: count one row to find 24 ÷ 4.',
          'Each row has 6, so 24 ÷ 4 = 6. There are 6 columns of 4, so 24 ÷ 6 = 4 as well.'],
        visual: arr(4, 6),
        caption: '24 dots: 4 rows of 6'
      },
      example: {
        title: '21 dots are in 3 equal rows. How many are in each row?', visual: arr(3, 7),
        steps: ['Total: **21**. Rows: **3**.', '21 ÷ 3 asks: 3 times what makes 21?', '3 × 7 = 21.', 'Each row has **7**: 21 ÷ 3 = 7.']
      },
      guided: { type: 'number', prompt: 'These 20 dots are in 4 equal rows. How many dots are in each row?', visual: arr(4, 5), answer: 5,
        hint: 'Count the dots in one row.', explain: '20 ÷ 4 = 5: each row has 5 dots.' },
      check: [
        { type: 'number', prompt: 'These 18 dots are in 2 equal rows. How many dots are in each row?', visual: arr(2, 9), answer: 9, explain: '18 ÷ 2 = 9.' },
        { type: 'number', prompt: 'These 32 dots are in rows of 8. How many rows are there?', visual: arr(4, 8), answer: 4, explain: '32 ÷ 8 = 4 rows.' },
        { type: 'number', prompt: 'Use the array: 36 ÷ 6 = ?', visual: arr(6, 6), answer: 6, explain: '6 rows of 6 make 36, so 36 ÷ 6 = 6.' }
      ]
    },
    {
      id: 'repeated-subtraction', title: 'Repeated subtraction',
      objective: 'I can divide by subtracting equal groups.',
      words: [{ term: 'subtract', meaning: 'take away' }],
      explain: {
        text: ['Division can be **repeated subtraction**.', 'Start at 20 and take away 5 again and again: 20, 15, 10, 5, 0.',
          'You took away 5 **four** times, so 20 ÷ 5 = 4.'],
        visual: { kind: 'jumpsBack', jumps: 4, size: 5 },
        caption: '4 jumps of 5 back to 0'
      },
      example: {
        title: 'Find 12 ÷ 3 by subtracting.', visual: { kind: 'jumpsBack', jumps: 4, size: 3 },
        steps: ['Start at **12**.', '12 − 3 = 9, 9 − 3 = 6, 6 − 3 = 3, 3 − 3 = 0.', 'That is **4** subtractions.', 'So 12 ÷ 3 = 4.']
      },
      guided: { type: 'number', prompt: 'Start at 18. Subtract 6 again and again until you reach 0. How many times do you subtract?', answer: 3,
        hint: '18 − 6 = 12. Keep going and count.', explain: '18, 12, 6, 0: that is 3 subtractions. 18 ÷ 6 = 3.' },
      check: [
        { type: 'number', prompt: 'Start at 16. Subtract 4 until you reach 0. How many times do you subtract?', answer: 4,
          explain: '16, 12, 8, 4, 0: 4 subtractions. 16 ÷ 4 = 4.', explainVisual: { kind: 'jumpsBack', jumps: 4, size: 4 } },
        { type: 'number', prompt: '10 − 2 − 2 − 2 − 2 − 2 = 0. How many 2s were subtracted?', answer: 5,
          explain: 'Five 2s take 10 down to 0, so 10 ÷ 2 = 5.', explainVisual: { kind: 'jumpsBack', jumps: 5, size: 2 } },
        { type: 'number', prompt: 'Use subtraction to find 21 ÷ 7.', answer: 3, explain: '21, 14, 7, 0: 3 subtractions. 21 ÷ 7 = 3.', explainVisual: { kind: 'jumpsBack', jumps: 3, size: 7 } }
      ]
    },
    {
      id: 'div-using-mult', title: 'Divide using multiplication',
      objective: 'I can use a multiplication fact to divide.',
      words: [{ term: 'related fact', meaning: 'a multiplication fact that uses the same numbers' }],
      explain: {
        text: ['Every division has a multiplication partner.', 'To find 28 ÷ 4, ask: **4 times what makes 28?**', '4 × 7 = 28, so 28 ÷ 4 = 7.'],
        visual: groups(4, 7),
        caption: '4 groups of 7 make 28'
      },
      example: {
        title: 'Find 45 ÷ 5.', visual: groups(5, 9),
        steps: ['Ask: 5 times what makes 45?', 'Count by 5s: 5, 10, 15, … 45. That is 9 fives.', '5 × 9 = 45.', 'So 45 ÷ 5 = **9**.']
      },
      guided: { type: 'number', prompt: '6 × ? = 54, so 54 ÷ 6 = ?', answer: 9, hint: 'Count by 6s up to 54 and count how many 6s.', explain: '6 × 9 = 54, so 54 ÷ 6 = 9.' },
      check: [
        { type: 'number', prompt: '32 ÷ 8 = ?', answer: 4, explain: '8 × 4 = 32, so 32 ÷ 8 = 4.' },
        { type: 'number', prompt: '63 ÷ 9 = ?', answer: 7, explain: '9 × 7 = 63, so 63 ÷ 9 = 7.' },
        { type: 'choice', prompt: 'Which fact helps you solve 42 ÷ 7?', options: ['7 + 6 = 13', '7 × 6 = 42', '7 × 7 = 49'], answer: '7 × 6 = 42',
          explain: '7 × 6 = 42, so 42 ÷ 7 = 6.' }
      ]
    },
    {
      id: 'div-fact-families', title: 'Fact families',
      objective: 'I can write the four facts in a multiplication and division fact family.',
      words: [{ term: 'fact family', meaning: 'facts that use the same three numbers' }],
      explain: {
        text: ['3, 8 and 24 make a **fact family**.', '3 × 8 = 24, 8 × 3 = 24, 24 ÷ 3 = 8 and 24 ÷ 8 = 3.', 'If you know one fact, you know all four!'],
        visual: set([arr(3, 8), '3 rows of 8'], [arr(8, 3), '8 rows of 3']),
        caption: '3, 8 and 24: four facts'
      },
      example: {
        title: 'The fact family for 4, 5 and 20', visual: arr(4, 5),
        steps: ['4 × 5 = 20', '5 × 4 = 20', '20 ÷ 4 = 5', '20 ÷ 5 = 4']
      },
      guided: { type: 'number', prompt: '6 × 7 = 42. So 42 ÷ 7 = ?', answer: 6, hint: 'Use the same three numbers: 6, 7 and 42.', explain: '42 ÷ 7 = 6 and 42 ÷ 6 = 7.' },
      check: [
        { type: 'choice', prompt: 'Which fact is in the same family as 9 × 4 = 36?', options: ['36 − 9 = 27', '36 ÷ 9 = 4', '45 ÷ 9 = 5'], answer: '36 ÷ 9 = 4',
          explain: '36 ÷ 9 = 4 uses the same three numbers: 9, 4 and 36.' },
        { type: 'number', prompt: '5 × 8 = 40. So 40 ÷ 8 = ?', answer: 5, explain: '40 ÷ 8 = 5 because 5 × 8 = 40.' },
        { type: 'number', prompt: '27 ÷ 3 = 9. So 27 ÷ 9 = ?', answer: 3, explain: '3, 9 and 27 are a fact family, so 27 ÷ 9 = 3.' }
      ]
    },
    {
      id: 'missing-divisors', title: 'Missing divisors',
      objective: 'I can find a missing divisor.',
      words: [{ term: 'divisor', meaning: 'the number you divide by' }],
      explain: {
        text: ['Sometimes the divisor is missing: **30 ÷ ? = 6**.', 'Ask: what number times 6 makes 30?', '5 × 6 = 30, so the missing divisor is **5**.'],
        visual: groups(5, 6),
        caption: '30 in 5 groups of 6'
      },
      example: {
        title: 'Find the missing divisor: 40 ÷ ? = 8', visual: groups(5, 8),
        steps: ['Think: ? × 8 = 40.', 'Count by 8s: 8, 16, 24, 32, 40. That is 5 eights.', 'So ? = **5**.', 'Check: 40 ÷ 5 = 8.']
      },
      guided: { type: 'number', prompt: '24 ÷ ? = 3', answer: 8, hint: 'What number times 3 makes 24?', explain: '8 × 3 = 24, so 24 ÷ 8 = 3.' },
      check: [
        { type: 'number', prompt: '18 ÷ ? = 6', answer: 3, explain: '3 × 6 = 18, so 18 ÷ 3 = 6.' },
        { type: 'number', prompt: '49 ÷ ? = 7', answer: 7, explain: '7 × 7 = 49, so 49 ÷ 7 = 7.' },
        { type: 'number', prompt: '60 ÷ ? = 10', answer: 6, explain: '6 × 10 = 60, so 60 ÷ 6 = 10.' }
      ]
    },
    {
      id: 'missing-dividends', title: 'Missing dividends',
      objective: 'I can find a missing dividend.',
      words: [{ term: 'dividend', meaning: 'the total you start with' }],
      explain: {
        text: ['Sometimes the dividend is missing: **? ÷ 4 = 6**.', 'The dividend is the total. 4 groups of 6 make 4 × 6 = 24.', 'So the missing dividend is **24**: 24 ÷ 4 = 6.'],
        visual: groups(4, 6),
        caption: '4 groups of 6 make 24'
      },
      example: {
        title: 'Find the missing dividend: ? ÷ 3 = 7', visual: groups(3, 7),
        steps: ['Think: 3 groups of 7.', '3 × 7 = 21.', 'So ? = **21**.', 'Check: 21 ÷ 3 = 7.']
      },
      guided: { type: 'number', prompt: '? ÷ 5 = 4', answer: 20, hint: '5 groups of 4 make how many in all?', explain: '5 × 4 = 20, so 20 ÷ 5 = 4.' },
      check: [
        { type: 'number', prompt: '? ÷ 2 = 9', answer: 18, explain: '2 × 9 = 18, so 18 ÷ 2 = 9.' },
        { type: 'number', prompt: '? ÷ 8 = 3', answer: 24, explain: '8 × 3 = 24, so 24 ÷ 8 = 3.' },
        { type: 'number', prompt: '? ÷ 6 = 6', answer: 36, explain: '6 × 6 = 36, so 36 ÷ 6 = 6.' }
      ]
    },
    {
      id: 'div-word-problems', title: 'Division word problems',
      objective: 'I can solve division word problems.',
      words: [{ term: 'equally', meaning: 'the same amount in each group' }],
      explain: {
        text: ['First find the **total**. Then ask: do I know the **number of groups**, or the **size of each group**?', 'Either way, divide the total.',
          'Then say what the answer means: 4 bags, 6 cookies each…'],
        visual: set([share(28, 4, 7), 'Sharing: 7 each'], [grp(18, 6, 3), 'Grouping: 3 groups']),
        caption: 'Find the total, then divide'
      },
      example: {
        title: '28 students sit equally at 4 tables. How many students sit at each table?', visual: share(28, 4, 7),
        steps: ['Total: **28** students.', 'Groups: **4** tables, so this is sharing.', '28 ÷ 4 = 7.', '**7** students sit at each table.']
      },
      guided: { type: 'number', prompt: 'Mia has 35 stickers. She puts 5 on each page. How many pages does she fill?', answer: 7,
        hint: 'You know how many go on each page (5). That is grouping.', hintVisual: grp(35, 5, 2), explain: '35 ÷ 5 = 7 pages.' },
      check: [
        { type: 'number', prompt: '48 cards are shared equally by 6 players. How many cards does each player get?', answer: 8, explain: '48 ÷ 6 = 8 cards each.' },
        { type: 'number', prompt: 'A van holds 9 people. How many vans are needed for 54 people?', answer: 6, explain: '54 ÷ 9 = 6 vans.' },
        { type: 'choice', prompt: 'Sam has 21 shells in 3 equal piles. Which finds how many are in each pile?', options: ['21 − 3', '21 × 3', '21 ÷ 3'], answer: '21 ÷ 3',
          explain: 'The total (21) is shared into 3 piles: 21 ÷ 3 = 7 in each pile.' }
      ]
    },
    {
      id: 'check-with-mult', title: 'Check with multiplication',
      objective: 'I can check a division answer by multiplying.',
      words: [{ term: 'check', meaning: 'make sure an answer is right' }],
      explain: {
        text: ['To check a division, **multiply** the quotient by the divisor.', 'If you get the dividend, the answer is right.', 'Check 56 ÷ 8 = 7: 7 × 8 = 56 ✓.'],
        visual: arr(8, 7),
        caption: '8 rows of 7 make 56'
      },
      example: {
        title: 'Is 45 ÷ 9 = 6 right?', visual: arr(9, 5),
        steps: ['Multiply: 6 × 9 = 54.', '54 is not 45, so 6 is **not** right.', 'Try 5: 5 × 9 = 45 ✓.', 'So 45 ÷ 9 = **5**.']
      },
      guided: { type: 'choice', prompt: 'Which multiplication checks 32 ÷ 4 = 8?', options: ['8 + 4 = 12', '8 × 4 = 32', '32 × 4 = 128'], answer: '8 × 4 = 32',
        hint: 'Multiply the answer by the divisor.', explain: '8 × 4 = 32, so 32 ÷ 4 = 8 is right.' },
      check: [
        { type: 'choice', prompt: 'Leo says 24 ÷ 3 = 7. Check with multiplication. Is he right?', options: ['Yes, he is right', 'No: 7 × 3 = 21, so 24 ÷ 3 = 8'], answer: 'No: 7 × 3 = 21, so 24 ÷ 3 = 8',
          explain: '7 × 3 = 21, not 24. 8 × 3 = 24, so 24 ÷ 3 = 8.' },
        { type: 'number', prompt: 'Check 63 ÷ 7 = 9. What is 9 × 7?', answer: 63, explain: '9 × 7 = 63, so 63 ÷ 7 = 9 is right.' },
        { type: 'number', prompt: 'Ava says 40 ÷ 5 = 8. To check, what is 8 × 5?', answer: 40, explain: '8 × 5 = 40, so Ava is right.' }
      ]
    },
    {
      id: 'explain-errors', title: 'Find and fix mistakes',
      objective: 'I can find a mistake in a division and explain how to fix it.',
      words: [{ term: 'mistake', meaning: 'an answer that is not right yet' }],
      explain: {
        text: ['Two common mistakes: **subtracting** instead of dividing (24 ÷ 6 = 18), or being **one group off** (24 ÷ 6 = 5).', 'Check with multiplication: 5 × 6 = 30, not 24.',
          '4 × 6 = 24, so 24 ÷ 6 = 4.'],
        visual: groups(6, 4),
        caption: '24 in 6 groups: 4 in each'
      },
      example: {
        title: 'Zoe says 36 ÷ 4 = 32. What went wrong?', visual: groups(4, 9),
        steps: ['Zoe subtracted: 36 − 4 = 32.', 'Division asks: 4 times what makes 36?', '4 × 9 = 36.', 'So 36 ÷ 4 = **9**.']
      },
      guided: { type: 'choice', prompt: 'Which student solved 30 ÷ 6 correctly?', options: ['Sam: 30 ÷ 6 = 24', 'Ava: 30 ÷ 6 = 5', 'Leo: 30 ÷ 6 = 6'], answer: 'Ava: 30 ÷ 6 = 5',
        hint: 'Check each answer: multiply it by 6.', explain: '6 × 5 = 30, so Ava is right. Sam subtracted, and Leo is one too many (6 × 6 = 36).' },
      check: [
        { type: 'choice', prompt: 'Which student solved 42 ÷ 7 correctly?', options: ['Eli: 42 ÷ 7 = 35', 'Noah: 42 ÷ 7 = 7', 'Mia: 42 ÷ 7 = 6'], answer: 'Mia: 42 ÷ 7 = 6',
          explain: '7 × 6 = 42, so Mia is right. Eli subtracted; Noah is one too many (7 × 7 = 49).' },
        { type: 'choice', prompt: 'Ruby says 18 ÷ 3 = 15. What mistake did she make?', options: ['She subtracted instead of dividing', 'She multiplied', 'She is right'], answer: 'She subtracted instead of dividing',
          explain: '18 − 3 = 15. Dividing: 3 × 6 = 18, so 18 ÷ 3 = 6.' },
        { type: 'number', prompt: 'Fix it: 56 ÷ 8 = ?', answer: 7, explain: '8 × 7 = 56, so 56 ÷ 8 = 7.' }
      ]
    },
    {
      id: 'remainders', title: 'Leftovers (extension)', challenge: true, extension: true,
      objective: 'I can tell what is left over when a total does not share equally.',
      words: [{ term: 'remainder', meaning: 'the amount left over' }],
      explain: {
        text: ['Sometimes things do not share equally.', '13 cookies shared by 4 friends: each friend gets 3, and **1** is left over.',
          'We say 13 ÷ 4 = 3 with a **remainder** of 1. This is an extension: flashcards and tests only use exact division.'],
        visual: share(13, 4, 3),
        caption: '3 each, 1 left over'
      },
      example: {
        title: 'Share 17 into 5 equal groups.', visual: share(17, 5, 3),
        steps: ['Deal 17 into 5 groups.', 'Each group gets **3** (5 × 3 = 15).', '17 − 15 = **2** left over.', '17 ÷ 5 = 3 with a remainder of 2.']
      },
      guided: { type: 'number', prompt: '11 stickers are shared by 3 friends. How many are left over?', visual: share(11, 3), answer: 2,
        hint: 'Each friend can get 3 (3 × 3 = 9). How many more make 11?', hintVisual: share(11, 3, 3), explain: 'Each friend gets 3, which uses 9 stickers. 11 − 9 = 2 are left over.' },
      check: [
        { type: 'number', prompt: 'Share 14 into 4 groups. Each group gets 3. How many are left over?', answer: 2, explain: '4 × 3 = 12, and 14 − 12 = 2 left over.', explainVisual: share(14, 4, 3) },
        { type: 'number', prompt: 'Share 10 into 3 groups. How many go in each group (some will be left over)?', answer: 3, explain: '3 × 3 = 9, so each group gets 3 and 1 is left over.', explainVisual: share(10, 3, 3) },
        { type: 'number', prompt: 'Share 20 into 6 groups. How many are left over?', answer: 2, explain: '6 × 3 = 18, and 20 − 18 = 2 left over.', explainVisual: share(20, 6, 3) }
      ]
    }
  ];

  const STEPS = ['Goal', 'Explanation', 'See it', 'Worked example', 'Try it together', 'Check yourself', 'Finish'];
  const PASS = 2;
  function checkLessonAnswer(question, given) {
    if (question.type === 'choice') return given === question.answer;
    return /^\d+$/.test(String(given ?? '')) && Number(given) === question.answer;
  }
  const UNITS = [
    { name: 'What division means', ids: ['what-division-means', 'equal-sharing', 'equal-grouping', 'share-or-group'] },
    { name: 'Division and multiplication', ids: ['div-equations', 'div-arrays', 'repeated-subtraction', 'div-using-mult', 'div-fact-families'] },
    { name: 'Use it and check it', ids: ['missing-divisors', 'missing-dividends', 'div-word-problems', 'check-with-mult', 'explain-errors', 'remainders'] }
  ];

  const api = { LESSONS, STEPS, PASS, UNITS, checkLessonAnswer, getLesson: (id) => LESSONS.find((l) => l.id === id) || null };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyDivLessons = api;
})(this);
