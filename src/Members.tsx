// Member identity: profile pictures, tags (badges under a member's name), phone verification, and the owner's tag tools.
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { BadgeCheck, Check, Crown, Flame, Gem, Heart, Pencil, Plus, Search, ShieldCheck, Smartphone, Sparkles, Star, Tags, Trash2, Trophy, X, Zap } from "lucide-react";
import {
  confirmPhoneCode, deleteTag, fetchMyTags, fetchProfile, fetchTags, findMembers, normalisePhone, phoneStatus, saveProfile, saveTag, sendPhoneCode,
  setMemberTag, tagIcons, uploadAvatar, type Member, type Profile, type Tag, type TagDraft, type TagIcon, type UserSession,
} from "./catalogStore";

type Banner = { ok: boolean; text: string };
type Fresh = () => Promise<UserSession | null>;
const messageOf = (problem: unknown) => problem instanceof Error ? problem.message : String(problem);

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "BH";

export function Avatar({ url, name, className = "" }: { url?: string; name: string; className?: string }) {
  return <span className={`avatar ${className}`.trim()}>{url ? <img src={url} alt={`${name} profile picture`}/> : initials(name)}</span>;
}

const icons: Record<TagIcon, typeof BadgeCheck> = {
  "badge-check": BadgeCheck, "shield-check": ShieldCheck, crown: Crown, sparkles: Sparkles, gem: Gem, star: Star, heart: Heart, flame: Flame, zap: Zap, trophy: Trophy,
};
const ownerTag: Tag = { id: 0, name: "BH Owner", icon: "badge-check", colour: "#8a5a3c", description: "Runs BH Clothing.", rule: "manual", sort_order: -1 };

export function TagChip({ tag }: { tag: Pick<Tag, "name" | "icon" | "colour" | "description"> }) {
  const Icon = icons[tag.icon] ?? BadgeCheck;
  return <span className="member-tag" style={{ ["--tag" as string]: tag.colour }} title={tag.description || tag.name}><Icon size={13}/>{tag.name}</span>;
}

// Shown under a member's name: on their profile now, and next to their reviews once reviews are live.
export function TagList({ tags, owner = false }: { tags: Tag[]; owner?: boolean }) {
  const all = owner ? [ownerTag, ...tags] : tags;
  if (!all.length) return null;
  return <div className="member-tags">{all.map((tag) => <TagChip key={tag.id} tag={tag}/>)}</div>;
}

// Square-crop and shrink the picture in the browser so uploads stay small; keeps the original if that isn't possible.
async function squarePicture(file: File, size = 400): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = Math.min(size, side);
    const context = canvas.getContext("2d"); if (!context) return file;
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((done) => canvas.toBlob((blob) => done(blob ?? file), "image/jpeg", .86));
  } catch {
    return file;
  }
}

// The profile picture itself is the editor: hovering it shows a pencil (choose a picture) and a red bin (back to initials).
export function AvatarEditor({ name, profile, freshSession, onSaved, onMessage }: { name: string; profile: Profile; freshSession: Fresh; onSaved: (profile: Profile) => void; onMessage: (banner: Banner) => void }) {
  const [busy, setBusy] = useState(false);
  const store = async (makeUrl: (session: UserSession) => Promise<string>, done: string) => {
    setBusy(true);
    try {
      const active = await freshSession(); if (!active) throw new Error("Your session ended. Please sign in again.");
      await saveProfile(active, { ...profile, avatar_url: await makeUrl(active) });
      const stored = await fetchProfile(active); if (stored) onSaved(stored);
      onMessage({ ok: true, text: done });
    } catch (problem) {
      onMessage({ ok: false, text: `Not saved: ${messageOf(problem)}` });
    } finally { setBusy(false); }
  };
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (file) void store(async (active) => uploadAvatar(active, await squarePicture(file)), "Your profile picture has been saved.");
  };
  return <div className={busy ? "avatar-editor busy" : "avatar-editor"} tabIndex={0} aria-label="Profile picture">
    <Avatar url={profile.avatar_url} name={name} className="avatar-orb"/>
    <div className="avatar-tools">
      <label className="avatar-tool" title={profile.avatar_url ? "Change picture" : "Add a picture"}><Pencil size={15}/><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={choose} aria-label={profile.avatar_url ? "Change profile picture" : "Add a profile picture"}/></label>
      {profile.avatar_url && <button type="button" className="avatar-tool remove" title="Remove picture" aria-label="Remove profile picture" disabled={busy} onClick={() => void store(async () => "", "Your profile picture was removed.")}><Trash2 size={15}/></button>}
    </div>
  </div>;
}

export function PhoneVerify({ freshSession, onVerified, onMessage }: { freshSession: Fresh; onVerified: (tags: Tag[]) => void; onMessage: (banner: Banner) => void }) {
  const [status, setStatus] = useState<{ phone: string; verified: boolean } | null>(null);
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void (async () => { const active = await freshSession(); if (active) setStatus(await phoneStatus(active).catch(() => ({ phone: "", verified: false }))); })(); }, []);
  const run = async (work: (session: UserSession) => Promise<void>) => {
    setBusy(true);
    try { const active = await freshSession(); if (!active) throw new Error("Your session ended. Please sign in again."); await work(active); }
    catch (problem) { onMessage({ ok: false, text: messageOf(problem) }); }
    finally { setBusy(false); }
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    const number = normalisePhone(phone);
    if (!number) { onMessage({ ok: false, text: "Check the phone number and include the country code, e.g. +972 50 123 4567." }); return; }
    void run(async (active) => { await sendPhoneCode(active, number); setSentTo(number); setCode(""); onMessage({ ok: true, text: `We sent a code by SMS to ${number}.` }); });
  };
  const confirm = (event: FormEvent) => {
    event.preventDefault();
    void run(async (active) => {
      const next = await confirmPhoneCode(active, sentTo, code);
      setStatus({ phone: sentTo, verified: true }); setSentTo("");
      onVerified(await fetchMyTags(next).catch(() => []));
      onMessage({ ok: true, text: "Your phone is verified. Your Verified tag is on your profile." });
    });
  };
  // First item of the Account settings list, in the same style as the other settings.
  return <article className="verify-item"><Smartphone size={21}/><div>
    <h3>Verify your account {status?.verified && <span className="verified-pill"><ShieldCheck size={12}/> Verified</span>}</h3>
    {status?.verified ? <p>Phone {status.phone.startsWith("+") ? status.phone : `+${status.phone}`} is confirmed. The Verified tag is on your profile.</p>
      : sentTo ? <form onSubmit={confirm}><p>Enter the 6-digit code we sent to {sentTo}.</p><div className="verify-row"><input inputMode="numeric" autoComplete="one-time-code" required maxLength={10} value={code} onChange={(event) => setCode(event.target.value)} aria-label="SMS code" placeholder="123456"/><button className="glow-button" disabled={busy}>{busy ? "Checking…" : "Verify"} <Check size={16}/></button><button type="button" className="ghost-pill" disabled={busy} onClick={() => setSentTo("")}>Change number</button></div></form>
      : <form onSubmit={send}><p>Confirm your phone number with an SMS code and get the Verified tag under your name.</p><div className="verify-row"><input type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone number" placeholder="+972 50 123 4567"/><button className="glow-button" disabled={busy || status === null}>{busy ? "Sending…" : "Send code"}</button></div></form>}
  </div></article>;
}

const blankTag = (): TagDraft => ({ name: "", icon: "badge-check", colour: "#8a5a3c", description: "", rule: "manual", sort_order: 10 });

// Owner area → Member tags: create, edit and delete tags, and give them to members.
export function TagsAdmin({ freshSession }: { freshSession?: Fresh }) {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [draft, setDraft] = useState<TagDraft | null>(null);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (work: (token: string) => Promise<void>) => {
    setBusy(true); setBanner(null);
    try { const active = await freshSession!(); if (!active) throw new Error("Your session ended. Please sign in again."); await work(active.accessToken); }
    catch (problem) { setBanner({ ok: false, text: messageOf(problem) }); }
    finally { setBusy(false); }
  };
  const reload = (token: string) => fetchTags(token).then(setTags);
  const lookUp = (token: string, text = search) => findMembers(text, token).then(setMembers);
  useEffect(() => { if (freshSession) void run(async (token) => { await reload(token); await lookUp(token, ""); }); }, []);
  if (!freshSession) return <><div className="workspace-head"><div><p className="eyebrow"><Tags size={14}/> MEMBER TAGS</p><h2>Tags<span>.</span></h2></div></div><p className="admin-copy">Member tags are saved in the live store database. Sign in to the live store to manage them.</p></>;
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (!draft) return;
    void run(async (token) => { const saved = await saveTag(draft, token); await reload(token); setDraft(null); setBanner({ ok: true, text: `The "${saved.name}" tag has been saved.` }); });
  };
  const remove = (tag: Tag) => {
    if (!window.confirm(`Delete the "${tag.name}" tag? It will be removed from everyone who has it.`)) return;
    void run(async (token) => { await deleteTag(tag.id, token); await reload(token); await lookUp(token); setBanner({ ok: true, text: `The "${tag.name}" tag was deleted.` }); });
  };
  const toggle = (member: Member, tag: Tag) => {
    const give = !member.tag_ids.includes(tag.id);
    void run(async (token) => { await setMemberTag(member.id, tag.id, give, token); await lookUp(token); setBanner({ ok: true, text: `${give ? "Gave" : "Removed"} "${tag.name}" ${give ? "to" : "from"} ${member.email}.` }); });
  };
  return <div className="tags-admin">
    <div className="workspace-head"><div><p className="eyebrow"><Tags size={14}/> MEMBER TAGS</p><h2>Tags<span>.</span></h2></div><button className="glow-button" onClick={() => setDraft(blankTag())}><Plus size={16}/> Create tag</button></div>
    <p className="admin-copy">Tags appear under a member's name on their profile and next to their reviews. "Phone verified" tags are given automatically when a member verifies their phone; the others you give by hand below.</p>
    {banner && <p className={banner.ok ? "save-banner save-ok" : "save-banner save-fail"} role={banner.ok ? "status" : "alert"}>{banner.ok ? <Check size={17}/> : <X size={17}/>}{banner.text}</p>}
    {draft && <form className="create-item-form tag-form" onSubmit={submit}>
      <label>Tag name<input required maxLength={30} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Top Buyer"/></label>
      <label>Icon<select value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value as TagIcon })}>{tagIcons.map((icon) => <option key={icon} value={icon}>{icon.replace("-", " ")}</option>)}</select></label>
      <label>Colour<input type="color" value={draft.colour} onChange={(event) => setDraft({ ...draft, colour: event.target.value })}/></label>
      <label>Who gets it<select value={draft.rule} onChange={(event) => setDraft({ ...draft, rule: event.target.value as Tag["rule"] })}><option value="manual">I give it by hand</option><option value="phone_verified">Everyone who verifies their phone</option></select></label>
      <label className="wide">Description (shown when hovering the tag)<input maxLength={160} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
      <div className="wide tag-preview">Preview: <TagChip tag={{ ...draft, name: draft.name || "Tag name" }}/></div>
      <div className="wide tag-form-actions"><button className="glow-button" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save tag" : "Create tag"} <Check size={16}/></button><button type="button" className="ghost-pill" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <div className="tag-table">{tags === null ? <p className="admin-copy">Loading tags…</p> : tags.length === 0 ? <p className="admin-copy">No tags yet. Create your first one.</p> : tags.map((tag) => <article key={tag.id}><TagChip tag={tag}/><p>{tag.description || "No description"}<small>{tag.rule === "phone_verified" ? "Automatic: phone verified" : "Given by hand"}</small></p><button className="ghost-pill" onClick={() => setDraft({ ...tag })}><Pencil size={14}/> Edit</button><button className="ghost-pill danger" onClick={() => remove(tag)}><Trash2 size={14}/> Delete</button></article>)}</div>
    <h3 className="tag-members-title">Give tags to members</h3>
    <form className="tag-search" onSubmit={(event) => { event.preventDefault(); void run((token) => lookUp(token)); }}><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by email, name or username" aria-label="Search members"/><button className="ghost-pill" disabled={busy}>Search</button></form>
    <div className="member-list">{members === null ? null : members.length === 0 ? <p className="admin-copy">No members found.</p> : members.map((member) => { const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.username || member.email.split("@")[0]; return <article key={member.id}><Avatar url={member.avatar_url} name={name} className="avatar-mini"/><div><b>{name}</b><small>{member.email}</small></div><div className="member-tag-toggles">{(tags ?? []).map((tag) => <button key={tag.id} className={member.tag_ids.includes(tag.id) ? "on" : ""} aria-pressed={member.tag_ids.includes(tag.id)} disabled={busy} onClick={() => toggle(member, tag)}><TagChip tag={tag}/></button>)}</div></article>; })}</div>
  </div>;
}
