/* Galaxy Math subject registry: which subjects and activities exist, and which are ready to use.
   Shared by index.html (browser global GalaxyMathRegistry) and the Node unit tests (module.exports). */
(function (root) {
  'use strict';

  // status: 'open' subjects have a menu; 'coming-soon' subjects are shown but cannot be opened.
  // ready: the activities that actually work today. Anything else is shown as "Coming soon".
  // views: extra screens under the subject (e.g. the parent progress page).
  const SUBJECTS = [
    { id: 'addition', name: 'Addition', symbol: '+', status: 'coming-soon', ready: [], views: [] },
    { id: 'subtraction', name: 'Subtraction', symbol: '−', status: 'coming-soon', ready: [], views: [] },
    { id: 'multiplication', name: 'Multiplication', symbol: '×', status: 'open', ready: ['teach', 'practice', 'lab', 'flashcards', 'test'], views: ['progress', 'settings'] },
    { id: 'division', name: 'Division', symbol: '÷', status: 'open', ready: ['teach', 'practice', 'lab', 'flashcards', 'test'], views: ['progress', 'settings'] }
  ];

  const ACTIVITIES = [
    { id: 'teach', name: 'Teach', icon: '💡', blurb: 'Show me how' },
    { id: 'practice', name: 'Practice', icon: '✏️', blurb: 'Let me try' },
    { id: 'lab', name: 'Math Thinking Lab', icon: '🧪', blurb: 'Make me think' },
    { id: 'flashcards', name: 'Flashcards', icon: '🃏', blurb: 'Help me remember' },
    { id: 'test', name: 'Test', icon: '⏱️', blurb: 'Show what I know' }
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

  function hasView(subjectId, view) { const s = getSubject(subjectId); return !!s && s.status === 'open' && s.views.includes(view); }

  // Hash routes: #/ (landing), #/<subject> (activity menu), #/<subject>/<activity> (activity start screen), #/<subject>/<view>.
  // Anything that points at a locked subject or unfinished activity falls back to the nearest safe screen.
  function resolveRoute(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    const [subject, activity] = parts;
    if (!subject || !isSubjectOpen(subject)) return { view: 'landing', hash: '#/' };
    if (activity && parts.length === 2 && hasView(subject, activity)) return { view: activity, subject, hash: `#/${subject}/${activity}` };
    if (!activity || parts.length > 2 || !isActivityReady(subject, activity)) return { view: 'menu', subject, hash: `#/${subject}` };
    return { view: 'setup', subject, activity, hash: `#/${subject}/${activity}` };
  }

  const api = { SUBJECTS, ACTIVITIES, getSubject, getActivity, isSubjectOpen, isActivityReady, readyCount, hasView, resolveRoute };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyMathRegistry = api;
})(this);
