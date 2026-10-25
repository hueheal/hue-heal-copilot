import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowSquareOut, Copy, DownloadSimple, InstagramLogo, PencilSimple } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { publishToInstagram } from '../lib/socialCopilot'
import { live } from './life'

/* One ready-to-post piece from the Founder's Digest: the finished slides in
   its brand's design, the caption to copy, and posting straight to the
   brand's Instagram when that account is connected. */

interface PostRow {
  id: string; brand_id: string | null; headline: string | null; caption: string | null; status: string
  format: string; image_url: string | null; slide_urls: string[] | null
}
interface BrandRow { id: string; name: string; instagram: { username?: string; expires_at?: string; access_token?: string } | null }

export default function Post() {
  const { id } = useParams()
  const [post, setPost] = useState<PostRow | null | undefined>()
  const [brand, setBrand] = useState<BrandRow | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!live || !id) { setPost(null); return }
    void (async () => {
      const { data } = await supabase!.from('social_posts').select('id, brand_id, headline, caption, status, format, image_url, slide_urls').eq('id', id).maybeSingle()
      const p = data as PostRow | null
      setPost(p)
      if (p?.brand_id) {
        const { data: b } = await supabase!.from('brand_profiles').select('id, name, instagram').eq('id', p.brand_id).maybeSingle()
        setBrand(b as BrandRow | null)
      }
    })()
  }, [id])

  if (post === undefined) return <div className="v2-col"><div className="v2-skeleton" style={{ height: 480 }} /></div>
  if (!post) return <div className="v2-col"><p className="v2-quiet">This post could not be found. It may have been deleted in the studio.</p></div>

  const slides = post.slide_urls?.length ? post.slide_urls : post.image_url ? [post.image_url] : []
  const designed = !!post.slide_urls?.length
  const ig = brand?.instagram
  const connected = !!ig?.access_token && (!ig.expires_at || new Date(ig.expires_at).getTime() > Date.now())
  const caption = post.caption ?? ''

  const copy = async () => { await navigator.clipboard.writeText(caption); setNote('Caption copied.') }
  const download = async () => {
    for (let i = 0; i < slides.length; i++) {
      const blob = await (await fetch(slides[i])).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(brand?.name ?? 'post').toLowerCase().replace(/[^a-z]+/g, '-')}-${i + 1}.jpg`
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }
  const publish = async () => {
    if (!window.confirm(`Post this ${slides.length > 1 ? `${slides.length}-slide carousel` : 'image'} to @${ig?.username} now?`)) return
    setBusy(true)
    const r = await publishToInstagram(slides, caption, post.brand_id ?? undefined)
    setBusy(false)
    if (!r.ok) { setNote(r.error ?? 'Instagram did not accept it.'); return }
    await supabase!.from('social_posts').update({ status: 'published' } as never).eq('id', post.id)
    setPost({ ...post, status: 'published' })
    setNote(r.permalink ? `Posted: ${r.permalink}` : 'Posted to Instagram.')
  }
  const markPosted = async () => {
    await supabase!.from('social_posts').update({ status: 'published' } as never).eq('id', post.id)
    setPost({ ...post, status: 'published' })
    setNote('Marked as posted.')
  }

  return (
    <div className="v2-col v2-wide v2-post">
      <div className="v2-page-head">
        <h1 className="v2-h-page">{brand?.name ?? 'Post'}</h1>
        <span className="v2-quiet">{post.status === 'published' ? 'Posted' : designed ? `Ready to post, ${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}` : 'Draft, designs not drawn yet'}</span>
      </div>
      {note && <p className="v2-quiet" role="status">{note}</p>}
      <div className="v2-post-grid">
        <div className="v2-post-slides" aria-label="Slides">
          {slides.map((u, i) => <img key={u} src={u} alt={`Slide ${i + 1} of ${slides.length}`} loading={i > 1 ? 'lazy' : undefined} />)}
          {!slides.length && <div className="v2-glass v2-digest-empty"><p className="v2-quiet">No image yet. Open it in the studio to design it.</p></div>}
        </div>
        <aside className="v2-glass v2-digest-panel">
          <h2 className="v2-label">{post.headline}</h2>
          <p className="v2-post-caption">{caption}</p>
          <div className="v2-chips">
            <button className="v2-chip" onClick={() => void copy()}><Copy size={15} />Copy caption</button>
            {!!slides.length && <button className="v2-chip" onClick={() => void download()}><DownloadSimple size={15} />Download {slides.length > 1 ? 'slides' : 'image'}</button>}
          </div>
          {post.status !== 'published' && (
            <div className="v2-chips">
              {connected
                ? <button className="v2-chip" data-primary="1" disabled={busy || !slides.length} onClick={() => void publish()}><InstagramLogo size={15} />{busy ? 'Posting' : `Post to @${ig?.username}`}</button>
                : <span className="v2-fine">Instagram is not connected for {brand?.name ?? 'this brand'}. Connect it in Settings, or copy the caption, download the slides and post by hand.</span>}
              <button className="v2-chip" onClick={() => void markPosted()}>I posted it</button>
            </div>
          )}
          <div className="v2-chips">
            <Link className="v2-link" to={`/create/social/${post.id}`}><PencilSimple size={14} />Edit in the studio</Link>
            {!connected && <Link className="v2-link" to="/settings"><ArrowSquareOut size={14} />Connect Instagram</Link>}
          </div>
        </aside>
      </div>
    </div>
  )
}
