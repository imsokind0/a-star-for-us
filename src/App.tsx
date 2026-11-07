
import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
  LogOut,
  Youtube,
  Pencil
} from 'lucide-react'
import { hasSupabase, supabase } from './lib/supabase'

type Page = 'home' | 'mailbox' | 'memories' | 'secret' | 'admin'

type Memory = {
  id: string
  title: string
  subtitle: string | null
  content: string | null
  image_url: string | null
  created_at: string
}

type Video = {
  id: string
  title: string
  youtube_url: string
  description: string | null
}

type Letter = {
  id: string
  nickname: string
  q1: string | null
  q2: string | null
  q3: string | null
  q4: string | null
  q5: string | null
  letter: string
  created_at: string
}

const anniversary = new Date('2026-11-10T00:00:00+09:00')

const sampleMemories: Memory[] = [
  {
    id: 'a',
    title: '첫 만남의 별',
    subtitle: '우리의 첫 페이지를 장식한 순간',
    content: '모든 이야기의 시작이 된 날. 오래도록 반짝일 우리의 첫 번째 별.',
    image_url: null,
    created_at: ''
  },
  {
    id: 'b',
    title: '함께 웃던 밤',
    subtitle: '웃음이 별처럼 쏟아졌던 날들',
    content: '별것 아닌 이야기에도 함께 웃었던 밤들을 기억해.',
    image_url: null,
    created_at: ''
  },
  {
    id: 'c',
    title: '지금의 별',
    subtitle: '앞으로도 우리의 소중한 추억으로 쌓이고 있어.',
    content: '지금 이 순간도 우리의 소중한 추억으로 쌓이고 있어.',
    image_url: null,
    created_at: ''
  },
]

const questions = [
  '뽀실애기를 처음 알게 된 계기는 무엇인가요?',
  '가장 좋아하는 뽀실이의 매력/장점 무엇인가요?',
  '방송을 보면서 가장 기억에 남았던 순간은?',
  '뽀실애기에게 해보고 싶었던 질문이 있나요?',
  '앞으로 뽀실애기와 함께 만들고 가고 싶은 순간이나 기대하는 모습이 있나요?',
]

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m?.[1] || ''
}

/* 유성우 배경 */
function Starscape({ active }: { active: boolean }) {
  const meteorStyle = {
    animationDuration: active ? '1.5s' : '5s'
  }

  return (
    <div
      className={`sky ${active ? 'anniversary-shower' : ''}`}
      aria-hidden="true"
    >
      <div
        className="stars stars-one"
        style={{ animationDuration: active ? '1.3s' : '5s' }}
      />
      <div
        className="stars stars-two"
        style={{ animationDuration: active ? '1.7s' : '7s' }}
      />
      <div className="shooting s1" style={meteorStyle}/>
      <div className="shooting s2" style={meteorStyle}/>
      <div className="shooting s3" style={meteorStyle}/>
      <div className="shooting s4" style={meteorStyle}/>
      <div className="shooting s5" style={meteorStyle}/>
    </div>
  )
}

function Crescent({ large = false }: { large?: boolean }) {
  return (
    <div className={`crescent ${large ? 'large' : ''}`}>
      <span/>
    </div>
  )
}

function Countdown() {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = Math.max(0, anniversary.getTime() - now)
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor(diff % 86400000 / 3600000)
  const mins = Math.floor(diff % 3600000 / 60000)
  const secs = Math.floor(diff % 60000 / 1000)

  return (
    <div className="countdown">
      <div className="eyebrow">COUNTING DOWN TO NOVEMBER 10.</div>
      <div className="time-row">
        {[[days, 'DAYS'], [hrs, 'HRS'], [mins, 'MIN'], [secs, 'SEC']].map(([n, l]) => (
          <div key={String(l)}>
            <strong>{String(n).padStart(2, '0')}</strong>
            <small>{l}</small>
          </div>
        ))}
      </div>
      <p>11월 10일, 우리에게 별빛이 쏟아집니다</p>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>(
    location.pathname.endsWith('/admin') ? 'admin' : 'home'
  )

  const [memories, setMemories] = useState<Memory[]>(sampleMemories)
  const [videos, setVideos] = useState<Video[]>([])
  const [letters, setLetters] = useState<Letter[]>([])
  const [selected, setSelected] = useState<Memory | null>(null)
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState<any>(null)
  const [adminReady, setAdminReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [nickname, setNickname] = useState('')
  const [answers, setAnswers] = useState(['', '', '', '', ''])
  const [letter, setLetter] = useState('')
  const [drawingData, setDrawingData] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [memoryForm, setMemoryForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    content: '',
    image_url: ''
  })

  const [videoForm, setVideoForm] = useState({
    id: '',
    title: '',
    youtube_url: '',
    description: ''
  })

  const [uploading, setUploading] = useState(false)
  const [deletingLetterId, setDeletingLetterId] = useState<string | null>(null)

  /* 유성우 미리보기 상태 */
  const [meteorPreview, setMeteorPreview] = useState(false)

  /* 실제 기념일 도달 여부 */
  const [anniversaryStarted, setAnniversaryStarted] = useState(
    () => Date.now() >= anniversary.getTime()
  )

  useEffect(() => {
    const checkAnniversary = () => {
      setAnniversaryStarted(Date.now() >= anniversary.getTime())
    }

    checkAnniversary()

    const timer = setInterval(checkAnniversary, 1000)

    return () => clearInterval(timer)
  }, [])

  /* 미리보기 또는 실제 기념일이면 유성우 실행 */
  const showMeteorShower = meteorPreview || anniversaryStarted

  useEffect(() => {
    if (!hasSupabase) {
      setAdminReady(true)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAdminReady(true)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !hasSupabase) {
      setIsAdmin(false)
      return
    }

    setAdminReady(false)

    supabase.rpc('is_site_admin').then(({ data, error }) => {
      if (error) {
        console.error('관리자 권한 확인 오류:', error)
        setIsAdmin(false)
        setAdminReady(true)
        return
      }

      setIsAdmin(Boolean(data))
      setAdminReady(true)
    })
  }, [session])

  useEffect(() => {
    if (!hasSupabase) return

    if (page === 'memories' || page === 'admin') {
      supabase
        .from('memories')
        .select('*')
        .order('created_at')
        .then(({ data }) => {
          if (data) setMemories(data)
        })
    }

    if (page === 'secret' || page === 'admin') {
      supabase
        .from('secret_videos')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setVideos(data)
        })
    }

    if (page === 'admin' && session) {
      supabase
        .from('mailbox')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('편지 불러오기 오류:', error)
            setNotice('편지를 불러오지 못했어요.')
            return
          }

          if (data) setLetters(data)
        })
    }
  }, [page, session])

  const nav = (p: Page) => {
    setPage(p)
    setSelected(null)
    setNotice('')

    const base = location.pathname.includes('/admin')
      ? location.pathname.slice(0, location.pathname.lastIndexOf('/'))
      : location.pathname.replace(/\/$/, '')

    if (p === 'admin') {
      history.pushState({}, '', `${base}/admin` || '/admin')
    } else {
      history.pushState({}, '', base ? `${base}/` : '/')
    }
  }

  const submitLetter = async (e: FormEvent) => {
    e.preventDefault()

    if (!nickname.trim() || !letter.trim()) {
      setNotice('닉네임과 1주년 편지를 작성해 주세요.')
      return
    }

    if (hasSupabase) {
      const { error } = await supabase.from('mailbox').insert({
        nickname: nickname.trim(),
        q1: answers[0] || null,
        q2: answers[1] || null,
        q3: answers[2] || null,
        q4: answers[3] || null,
        q5: answers[4] || null,
        letter: letter.trim()
      })

      if (error) {
        setNotice('편지를 보내지 못했어요. 잠시 후 다시 시도해 주세요.')
        return
      }
    }

    setNotice('별빛 편지가 무사히 도착했어요. 고마워요 ✦')
    setNickname('')
    setAnswers(['', '', '', '', ''])
    setLetter('')
  }

  const login = async (e: FormEvent) => {
    e.preventDefault()
    setNotice('')

    if (!hasSupabase) {
      setNotice('Supabase 환경변수가 설정되지 않았어요.')
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })

      if (error) {
        console.error('Supabase 로그인 오류:', error)
        setNotice(`로그인 실패: ${error.message}`)
        return
      }

      if (!data.session) {
        setNotice('로그인은 처리됐지만 세션이 확인되지 않아요.')
        return
      }

      setSession(data.session)
      setLoginPassword('')
      setNotice('로그인되었습니다.')
    } catch (err) {
      console.error('로그인 중 오류:', err)

      setNotice(
        err instanceof Error
          ? `오류 발생: ${err.message}`
          : '알 수 없는 로그인 오류가 발생했어요.'
      )
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setLetters([])
  }

  const saveMemory = async (e: FormEvent) => {
    e.preventDefault()
    if (!hasSupabase) return

    const payload = {
      title: memoryForm.title,
      subtitle: memoryForm.subtitle || null,
      content: memoryForm.content || null,
      image_url: memoryForm.image_url || null
    }

    const result = memoryForm.id
      ? await supabase.from('memories').update(payload).eq('id', memoryForm.id)
      : await supabase.from('memories').insert(payload)

    if (result.error) {
      setNotice('추억을 저장하지 못했어요.')
      return
    }

    setMemoryForm({
      id: '',
      title: '',
      subtitle: '',
      content: '',
      image_url: ''
    })

    const { data } = await supabase
      .from('memories')
      .select('*')
      .order('created_at')

    if (data) setMemories(data)

    setNotice('추억을 저장했어요 ✦')
  }

  const saveVideo = async (e: FormEvent) => {
    e.preventDefault()
    if (!hasSupabase) return

    if (!youtubeId(videoForm.youtube_url)) {
      setNotice('올바른 유튜브 영상 링크를 입력해 주세요.')
      return
    }

    const payload = {
      title: videoForm.title,
      youtube_url: videoForm.youtube_url,
      description: videoForm.description || null
    }

    const result = videoForm.id
      ? await supabase.from('secret_videos').update(payload).eq('id', videoForm.id)
      : await supabase.from('secret_videos').insert(payload)

    if (result.error) {
      setNotice('영상을 저장하지 못했어요.')
      return
    }

    setVideoForm({
      id: '',
      title: '',
      youtube_url: '',
      description: ''
    })

    const { data } = await supabase
      .from('secret_videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setVideos(data)

    setNotice('시크릿 커버를 업데이트했어요 ✦')
  }

  const uploadImage = async (file?: File) => {
    if (!file || !hasSupabase) return

    setUploading(true)

    const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`

    const { error } = await supabase.storage
      .from('memory-images')
      .upload(path, file, { upsert: false })

    if (error) {
      setNotice('이미지 업로드에 실패했어요.')
    } else {
      const { data } = supabase.storage
        .from('memory-images')
        .getPublicUrl(path)

      setMemoryForm(v => ({
        ...v,
        image_url: data.publicUrl
      }))

      setNotice('이미지를 업로드했어요.')
    }

    setUploading(false)
  }

  const removeMemory = async (id: string) => {
    if (!confirm('이 추억을 삭제할까요?')) return

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)

    if (error) {
      setNotice('추억을 삭제하지 못했어요.')
      return
    }

    setMemories(v => v.filter(x => x.id !== id))
    setNotice('추억을 삭제했어요.')
  }

  const removeVideo = async (id: string) => {
    if (!confirm('이 영상을 삭제할까요?')) return

    const { error } = await supabase
      .from('secret_videos')
      .delete()
      .eq('id', id)

    if (error) {
      setNotice('영상을 삭제하지 못했어요.')
      return
    }

    setVideos(v => v.filter(x => x.id !== id))
    setNotice('영상을 삭제했어요.')
  }

  /* 도착한 편지 삭제 */
  const removeLetter = async (id: string) => {
    if (!isAdmin || !hasSupabase || deletingLetterId) return

    const confirmed = confirm(
      '이 편지를 정말 삭제할까요?\n삭제하면 다시 복구할 수 없어요.'
    )

    if (!confirmed) return

    setDeletingLetterId(id)
    setNotice('')

    const { error } = await supabase
      .from('mailbox')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('편지 삭제 오류:', error)
      setNotice('편지를 삭제하지 못했어요. Supabase 삭제 권한을 확인해 주세요.')
      setDeletingLetterId(null)
      return
    }

    setLetters(current => current.filter(item => item.id !== id))
    setNotice('편지를 삭제했어요.')
    setDeletingLetterId(null)
  }

  const title =
    page === 'mailbox'
      ? '별빛 우체통'
      : page === 'memories'
        ? '우리의 추억'
        : page === 'secret'
          ? '시크릿 커버'
          : ''

  return (
    <div className={showMeteorShower ? 'celebration-mode' : ''}>
      <Starscape active={showMeteorShower}/>

      <div className="sparkle-corner">✦</div>

      <header className="topbar">
        <button
          className={page === 'mailbox' ? 'active' : ''}
          onClick={() => nav('mailbox')}
        >
          별빛 우체통
        </button>

        <button
          className={page === 'memories' ? 'active' : ''}
          onClick={() => nav('memories')}
        >
          추억
        </button>

        <button
          className={page === 'secret' ? 'active' : ''}
          onClick={() => nav('secret')}
        >
          SECRET COVER✧
        </button>
      </header>

      {page === 'home' && (
        <main className="home page-wrap">
          <div className="hero">
            <Crescent large/>

            <div className="eyebrow couple">
              BOOSIL-AEGI &amp; KKUJIL · ONE YEAR TOGETHER
            </div>

            <h1>
              A STAR <em>FOR</em> US <span>✦</span>
            </h1>

            <p className="hero-sub">우리의 첫 번째 궤도 ♡</p>

            <div className="ornaments">✧　✦</div>

            <Countdown/>
          </div>

          <section className="home-cards">
            <button className="home-card" onClick={() => nav('mailbox')}>
              <small>STARRY MAILBOX</small>
              <strong>별빛 우체통</strong>
              <p>뽀실애기에게 1주년 편지를 띄워요</p>
              <ArrowRight/>
            </button>

            <button className="home-card" onClick={() => nav('memories')}>
              <small>MEMORIES</small>
              <strong>우리의 추억</strong>
              <p>함께 그려온 별자리를 돌아봐요</p>
              <ArrowRight/>
            </button>

            <button className="home-card" onClick={() => nav('secret')}>
              <small>SECRET COVER</small>
              <strong>시크릿 커버</strong>
              <p>아직은 비밀인 선물 하나 ✦</p>
              <ArrowRight/>
            </button>
          </section>

          <footer className="home-footer">
            <button onClick={() => nav('admin')}>관리자</button>
            <span>made of starlight, made for us ♡</span>
          </footer>
        </main>
      )}

      {page !== 'home' && page !== 'admin' && (
        <main className="inner page-wrap">
          <div className="section-heading">
            <div className="eyebrow">
              {page === 'mailbox'
                ? 'STARRY MAILBOX'
                : page === 'memories'
                  ? 'MEMORIES'
                  : 'SECRET COVER'}
            </div>

            <h2>{title}</h2>

            <p>
              {page === 'mailbox'
                ? '꾸질이의 마음을 별빛 편지로 전해 주세요.'
                : page === 'memories'
                  ? '하나하나 이어져 별자리가 된 순간들'
                  : '뽀실애기가 꾸질이들에게 준비한 작은 선물.'}
            </p>
          </div>

          {page === 'mailbox' && (
            <form className="letter-form" onSubmit={submitLetter}>
              <div className="form-card">
                <label>닉네임 <b>*</b></label>
                <small>뺏실애기가 알아볼 수 있는 닉네임</small>

                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="꾸질이 닉네임을 적어주세요"
                  required
                  maxLength={40}
                />
              </div>

              {questions.map((q, i) => (
                <div className="form-card" key={q}>
                  <label>
                    <span className="number">0{i + 1}</span> {q} <i>(선택)</i>
                  </label>

                  <small>자유롭게 적어주세요.</small>

                  <textarea
                    value={answers[i]}
                    onChange={e =>
                      setAnswers(a =>
                        a.map((v, j) => j === i ? e.target.value : v)
                      )
                    }
                    placeholder="편하게 마음을 적어주세요."
                    rows={3}
                  />
                </div>
              ))}

              <div className="form-card">
                <label>
                  <span className="number">06</span> 1주년을 맞아 뺏실애기에게 전하고 싶은 편지 <b>*</b>
                </label>

                <small>사랑하는 뺏실애기에게...</small>

                <textarea
                  className="long-letter"
                  value={letter}
                  onChange={e => setLetter(e.target.value)}
                  placeholder="사랑하는 뺏실애기에게..."
                  required
                  rows={5}
                />
              </div>

              <button className="pink-button" type="submit">
                별빛 편지 띄우기 <Sparkles size={14}/>
              </button>

              {notice && <p className="notice">{notice}</p>}
            </form>
          )}

          {page === 'memories' && (
            <div className="memory-grid">
              {memories.map(m => (
                <button
                  className="memory-card"
                  key={m.id}
                  onClick={() => setSelected(m)}
                >
                  <div className="memory-art">
                    {m.image_url
                      ? <img src={m.image_url} alt={m.title}/>
                      : <span>✧</span>}
                  </div>

                  <div className="memory-copy">
                    <strong>{m.title}</strong>
                    <p>{m.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {page === 'secret' && (
            <div className="secret-panel">
              {videos.length === 0 ? (
                <>
                  <Crescent large/>
                  <h3>별빛을 모으는 중...</h3>
                  <p>아직은 비밀인 선물이에요. 조금만 기다려 주세요 ♡</p>
                </>
              ) : (
                <div className="video-grid">
                  {videos.map(v => (
                    <article className="video-card" key={v.id}>
                      <div className="video-frame">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${youtubeId(v.youtube_url)}`}
                          title={v.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>

                      <h3>{v.title}</h3>

                      {v.description && <p>{v.description}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {selected && (
            <div
              className="modal-backdrop"
              onClick={() => setSelected(null)}
            >
              <div
                className="memory-modal"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="close"
                  onClick={() => setSelected(null)}
                >
                  <X/>
                </button>

                {selected.image_url && (
                  <img src={selected.image_url} alt={selected.title}/>
                )}

                <div className="eyebrow">A MOMENT TO REMEMBER</div>
                <h3>{selected.title}</h3>
                <p className="modal-subtitle">{selected.subtitle}</p>
                <p className="modal-content">{selected.content}</p>
              </div>
            </div>
          )}
        </main>
      )}

      {page === 'admin' && (
        <main className="admin-wrap page-wrap">
          <div className="section-heading">
            <div className="eyebrow">PRIVATE SPACE</div>
            <h2>관리자 페이지</h2>
            <p>우리의 별빛을 관리하는 공간</p>
          </div>

          {!session ? (
            <form className="admin-login" onSubmit={login}>
              <div className="lock-icon"><LockKeyhole/></div>
              <h3>관리자 로그인</h3>
              <p>허가된 관리자만 입장할 수 있어요.</p>

              <label>아이디 (이메일)</label>

              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />

              <label>비밀번호</label>

              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="비밀번호를 입력해 주세요"
                required
              />

              <button className="pink-button">
                로그인 <ArrowRight size={15}/>
              </button>

              {notice && <p className="notice">{notice}</p>}
            </form>
          ) : !adminReady ? (
            <p className="notice">관리자 권한을 확인하고 있어요...</p>
          ) : !isAdmin ? (
            <div className="admin-login">
              <div className="lock-icon"><LockKeyhole/></div>
              <h3>접근 권한이 없어요</h3>
              <p>이 계정은 관리자 목록에 등록되어 있지 않습니다.</p>
              <button className="pink-button" onClick={logout}>
                로그아웃
              </button>
            </div>
          ) : (
            <div className="admin-content">
              <div className="admin-top">
                <p>
                  {meteorPreview
                    ? '🌠 유성우 미리보기 모드가 실행 중이에요!'
                    : anniversaryStarted
                      ? '🌠 기념일 유성우 모드가 실행 중이에요!'
                      : '관리자 계정으로 로그인되어 있어요.'}
                </p>

                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setMeteorPreview(v => !v)}
                  aria-pressed={meteorPreview}
                >
                  <Sparkles size={14}/>
                  {meteorPreview ? '미리보기 종료' : '유성우 미리보기'}
                </button>

                <button
                  className="outline-button"
                  onClick={logout}
                >
                  <LogOut size={14}/> 로그아웃
                </button>
              </div>

              {!hasSupabase && (
                <p className="notice">
                  Supabase 연결을 설정해야 관리 기능을 사용할 수 있어요.
                </p>
              )}

              <section className="admin-section">
                <div className="admin-title">
                  <div>
                    <div className="eyebrow">STARRY MAILBOX</div>
                    <h3>도착한 편지 <span>{letters.length}</span></h3>
                  </div>
                </div>

                {letters.length === 0 ? (
                  <p className="empty">아직 도착한 편지가 없어요.</p>
                ) : (
                  <div className="letter-list">
                    {letters.map(l => (
                      <article className="received-letter" key={l.id}>
                        <div className="received-head">
                          <strong>{l.nickname}</strong>

                          <div className="received-actions">
                            <time>
                              {new Date(l.created_at).toLocaleString('ko-KR')}
                            </time>

                            <button
                              type="button"
                              className="delete-letter-button"
                              onClick={() => removeLetter(l.id)}
                              disabled={deletingLetterId === l.id}
                              title="편지 삭제"
                              aria-label={`${l.nickname}의 편지 삭제`}
                            >
                              <Trash2 size={15}/>
                              {deletingLetterId === l.id ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        </div>

                        {questions.map((q, i) => {
                          const val = [l.q1, l.q2, l.q3, l.q4, l.q5][i]

                          return val ? (
                            <div className="answer" key={q}>
                              <b>{q}</b>
                              <p>{val}</p>
                            </div>
                          ) : null
                        })}

                        <div className="answer final-answer">
                          <b>1주년 편지</b>
                          <p>{l.letter}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-section">
                <div className="admin-title">
                  <div>
                    <div className="eyebrow">MEMORIES</div>
                    <h3>추억 관리</h3>
                  </div>
                </div>

                <form className="admin-form" onSubmit={saveMemory}>
                  <input
                    value={memoryForm.title}
                    onChange={e =>
                      setMemoryForm(v => ({ ...v, title: e.target.value }))
                    }
                    placeholder="추억 제목"
                    required
                  />

                  <input
                    value={memoryForm.subtitle}
                    onChange={e =>
                      setMemoryForm(v => ({ ...v, subtitle: e.target.value }))
                    }
                    placeholder="짧은 설명"
                  />

                  <textarea
                    value={memoryForm.content}
                    onChange={e =>
                      setMemoryForm(v => ({ ...v, content: e.target.value }))
                    }
                    placeholder="추억의 자세한 내용"
                    rows={3}
                  />

                  <div className="upload-row">
                    <label className="upload-button">
                      <Upload size={15}/>
                      {uploading ? '업로드 중...' : '이미지 업로드'}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImage(e.target.files?.[0])}
                        disabled={uploading}
                      />
                    </label>

                    <input
                      value={memoryForm.image_url}
                      onChange={e =>
                        setMemoryForm(v => ({ ...v, image_url: e.target.value }))
                      }
                      placeholder="또는 이미지 URL 입력"
                    />
                  </div>

                  {memoryForm.image_url && (
                    <img
                      className="upload-preview"
                      src={memoryForm.image_url}
                      alt="업로드 미리보기"
                    />
                  )}

                  <button className="pink-button">
                    <Plus size={15}/>
                    {memoryForm.id ? '수정 저장' : '추억 추가'}
                  </button>

                  {memoryForm.id && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setMemoryForm({
                          id: '',
                          title: '',
                          subtitle: '',
                          content: '',
                          image_url: ''
                        })
                      }
                    >
                      수정 취소
                    </button>
                  )}
                </form>

                <div className="manage-list">
                  {memories.map(m => (
                    <div className="manage-row" key={m.id}>
                      {m.image_url
                        ? <img src={m.image_url} alt=""/>
                        : <div className="mini-art">✧</div>}

                      <div>
                        <b>{m.title}</b>
                        <small>{m.subtitle}</small>
                      </div>

                      <button
                        onClick={() =>
                          setMemoryForm({
                            id: m.id,
                            title: m.title,
                            subtitle: m.subtitle || '',
                            content: m.content || '',
                            image_url: m.image_url || ''
                          })
                        }
                      >
                        <Pencil size={15}/>
                      </button>

                      <button onClick={() => removeMemory(m.id)}>
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-section">
                <div className="admin-title">
                  <div>
                    <div className="eyebrow">SECRET COVER</div>
                    <h3>시크릿 영상 관리</h3>
                  </div>
                </div>

                <form className="admin-form" onSubmit={saveVideo}>
                  <input
                    value={videoForm.title}
                    onChange={e =>
                      setVideoForm(v => ({ ...v, title: e.target.value }))
                    }
                    placeholder="영상 제목"
                    required
                  />

                  <input
                    value={videoForm.youtube_url}
                    onChange={e =>
                      setVideoForm(v => ({ ...v, youtube_url: e.target.value }))
                    }
                    placeholder="유튜브 링크 (https://youtu.be/...)"
                    required
                  />

                  <textarea
                    value={videoForm.description}
                    onChange={e =>
                      setVideoForm(v => ({ ...v, description: e.target.value }))
                    }
                    placeholder="영상 설명 (선택)"
                    rows={2}
                  />

                  <button className="pink-button">
                    <Plus size={15}/>
                    {videoForm.id ? '영상 수정' : '영상 등록'}
                  </button>

                  {videoForm.id && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setVideoForm({
                          id: '',
                          title: '',
                          youtube_url: '',
                          description: ''
                        })
                      }
                    >
                      수정 취소
                    </button>
                  )}
                </form>

                <div className="manage-list">
                  {videos.map(v => (
                    <div className="manage-row" key={v.id}>
                      <div className="mini-art"><Youtube/></div>

                      <div>
                        <b>{v.title}</b>
                        <small>{v.youtube_url}</small>
                      </div>

                      <button
                        onClick={() =>
                          setVideoForm({
                            id: v.id,
                            title: v.title,
                            youtube_url: v.youtube_url,
                            description: v.description || ''
                          })
                        }
                      >
                        <Pencil size={15}/>
                      </button>

                      <button onClick={() => removeVideo(v.id)}>
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      )}

      {page !== 'home' && (
        <button className="back-home" onClick={() => nav('home')}>
          <ArrowLeft size={14}/> 홈으로 돌아가기
        </button>
      )}

      {notice && page !== 'mailbox' && page !== 'admin' && (
        <div className="toast">{notice}</div>
      )}
    </div>
  )
}

export default App
import DrawingCanvas from './DrawingCanvas'
