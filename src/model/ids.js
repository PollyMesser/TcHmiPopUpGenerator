// ── Globale ID-Zähler (ein Ort für alle Module – sonst kollidieren IDs) ──
let _id = 1;
let _eid = 1;
let _pid = 1;
const nid = () => "b" + (_id++);
const eid = (pfx) => (pfx || "c") + (_eid++);
const pid = (pfx) => (pfx || "p") + (_pid++);

export { nid, eid, pid };
