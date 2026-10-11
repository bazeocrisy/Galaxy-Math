/* Galaxy Math subject registry: which subjects and activities exist, and which are ready to use.
   Shared by index.html (browser global GalaxyMathRegistry) and the Node unit tests (module.exports). */
(function (root) {
  'use strict';

  // status: 'open' subjects have a menu; 'coming-soon' subjects are shown but cannot be opened.
  // ready: the activities that actually work today. Anything else is shown as "Coming soon".
  const SUBJECTS = [
    { id: 'addition', name: 'Addition', symbol: '+', status: 'coming-soon', ready: [] },
    { id: 'subtraction', name: 'Subtraction', symbol: '−', status: 'coming-soon', ready: [] },
    { id: 'multiplication', name: 'Multiplication', symbol: '×', status: 'open', ready: ['flashcards', 'test'] },
    { id: 'division', name: 'Division', symbol: '÷', status: 'open', ready: [] }
  ];

  const ACTIVITIES = [
    { id: 'teach', name: 'Teach', icon: '💡', blurb: 'Learn how it works' },
    { id: 'practice', name: 'Practice', icon: '✏️', blurb: 'Try it with hints' },
    { id: 'flashcards', name: 'Flashcards', icon: '🃏', blurb: 'Flip and remember' },
    { id: 'test', name: 'Test', icon: '⏱️', blurb: 'Show what you know' }
  ];

  function getSubject(id) { return SUBJECTS.find((s) => s.id === id) || null; }
  function getActivity(id) { return ACTIVITIES.find((a) => a.id === id) || null; }
  function isSubjectOpen(id) { const s = getSubject(id); return !!s && s.status === 'open'; }
  function isActivityReady(subjectId, activityId) {
    const s = getSubject(subjectId);
    return !!s && s.status === 'open' && !!getActivity(activityId) && s.ready.includes(activityId);
  }
  function readyCount(subjectId) {
    const s = getSubject(subjectId);
    return s && s.status === 'open' ? s.ready.length : 0;
  }

  // Hash routes: #/ (landing), #/<subject> (activity menu), #/<subject>/<activity> (activity setup).
  // Anything that points at a locked subject or unfinished activity falls back to the nearest safe screen.
  function resolveRoute(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    const [subject, activity] = parts;
    if (!subject || !isSubjectOpen(subject)) return { view: 'landing', hash: '#/' };
    if (!activity || parts.length > 2 || !isActivityReady(subject, activity)) return { view: 'menu', subject, hash: `#/${subject}` };
    return { view: 'setup', subject, activity, hash: `#/${subject}/${activity}` };
  }

  const api = { SUBJECTS, ACTIVITIES, getSubject, getActivity, isSubjectOpen, isActivityReady, readyCount, resolveRoute };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyMathRegistry = api;
})(this);
