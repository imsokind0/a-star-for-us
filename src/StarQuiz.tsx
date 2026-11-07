
import { useEffect, useState, type FormEvent } from 'react'
import {
  Star, Trophy, Sparkles, Check, LockKeyhole, RotateCcw,
  Users, Crown, Plus, Pencil, Trash2, Eye, EyeOff, X,
} from 'lucide-react'
import { hasSupabase, supabase } from './lib/supabase'

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  explanation: string | null
  is_published: boolean
  is_revealed: boolean
  created_at: string
  order_index: number
}

type QuizStats = {
  option_index: number
  vote_count: number
  total_votes: number
  correct_votes: number
  accuracy: number
  percentage?: number
}

type LeaderboardItem = {
  nickname: string
  correct_count: number
  total_count: number
  accuracy: number
  rank_number: number
}

type Participant = {
  nickname: string
  selected_option: number
  voter_id: string
  created_at: string
}

const VOTER_STORAGE_KEY = 'a-star-for-us-quiz-voter'
const NICKNAME_STORAGE_KEY = 'a-star-for-us-quiz-nickname'
const CARD_NAMES = ['THE STAR', 'THE MOON', 'THE SUN', 'THE COSMOS']
const CARD_SYMBOLS = ['✦', '☾', '☼', '✧']

function getVoterId() {
  let id = localStorage.getItem(VOTER_STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VOTER_STORAGE_KEY, id)
  }
  return id
}

function getSavedNickname() {
  return localStorage.getItem(NICKNAME_STORAGE_KEY) || ''
}

function saveNickname(nickname: string) {
  localStorage.setItem(NICKNAME_STORAGE_KEY, nickname)
}

export default function StarQuiz({ isAdmin = false }: { isAdmin?: boolean }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [stats, setStats] = useState<Record<string, QuizStats[]>>({})
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({})
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [nickname, setNickname] = useState(getSavedNickname)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameOpen, setNicknameOpen] = useState(!getSavedNickname())
  const [voterId] = useState(getVoterId)
  const [myVotes, setMyVotes] = useState<Record<string, number>>({})
  const [selectedCards, setSelectedCards] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState<'quiz' | 'ranking'>('quiz')

  // 관리자 문제 작성 폼
  const emptyForm = {
    question: '',
    options: ['', '', '', ''],
    correctOption: 0,
    explanation: '',
    isPublished: false,
    orderIndex: 0,
  }
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(true)

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false)
      setNotice('Supabase 연결을 확인해주세요.')
      return
    }
    void loadQuestions()
    void loadLeaderboard()
  }, [isAdmin])

  async function loadQuestions() {
    setLoading(true)

    let query = supabase
      .from('quiz_questions')
      .select(
        'id, question, options, explanation, is_published, is_revealed, created_at, order_index',
      )
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })

    if (!isAdmin) query = query.eq('is_published', true)

    const { data, error } = await query

    if (error) {
      setNotice(`퀴즈를 불러오지 못했어요: ${error.message}`)
      setLoading(false)
      return
    }

    const list = (data || []) as QuizQuestion[]
    setQuestions(list)

    for (const question of list) {
      if (question.is_revealed) void loadStats(question.id)
      if (isAdmin) void loadAdminAnswer(question.id)
    }

    setLoading(false)
  }

  async function loadStats(questionId: string) {
    const { data, error } = await supabase.rpc('quiz_question_stats', {
      p_question_id: questionId,
    })
    if (!error && data) {
      setStats((prev) => ({ ...prev, [questionId]: data as QuizStats[] }))
    }
  }

  async function loadAdminAnswer(questionId: string) {
    if (!isAdmin) return
    const { data, error } = await supabase.rpc('quiz_question_answer', {
      p_question_id: questionId,
    })
    if (!error && data !== null) {
      setAnswers((prev) => ({ ...prev, [questionId]: Number(data) }))
    }
  }

  async function loadParticipants(questionId: string) {
    if (!isAdmin) return
    const { data, error } = await supabase.rpc('quiz_admin_participants', {
      p_question_id: questionId,
    })
    if (error) {
      setNotice(`참여자 조회 실패: ${error.message}`)
      return
    }
    setParticipants((prev) => ({ ...prev, [questionId]: (data || []) as Participant[] }))
  }

  async function loadLeaderboard() {
    const { data, error } = await supabase.rpc('quiz_leaderboard')
    if (!error && data) setLeaderboard(data as LeaderboardItem[])
  }

  function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = nicknameInput.trim()

    if (value.length < 2 || value.length > 20) {
      setNotice('닉네임은 2~20자로 입력해주세요.')
      return
    }

    saveNickname(value)
    setNickname(value)
    setNicknameOpen(false)
    setNicknameInput('')
    setNotice(`${value} 꾸질이로 등록되었어요!`)
  }

  async function handleVote(question: QuizQuestion, optionIndex: number) {
    if (!nickname) {
      setNicknameOpen(true)
      return
    }
    if (question.is_revealed) {
      setNotice('이미 정답이 공개된 문제예요.')
      return
    }
    if (myVotes[question.id] !== undefined) {
      setNotice('이미 참여한 퀴즈예요!')
      return
    }

    const confirmed = window.confirm(
      `"${question.options[optionIndex]}"를 선택할까요?\n투표 후에는 변경할 수 없어요.`,
    )
    if (!confirmed) return

    setSubmitting(question.id)
    setNotice('')

    const { error } = await supabase.rpc('quiz_submit_vote', {
      p_question_id: question.id,
      p_voter_id: voterId,
      p_nickname: nickname,
      p_option: optionIndex,
    })

    if (error) {
      setNotice(
        error.message.includes('이미 참여')
          ? '이미 참여한 퀴즈예요!'
          : `투표에 실패했어요: ${error.message}`,
      )
      setSubmitting(null)
      return
    }

    setMyVotes((prev) => ({ ...prev, [question.id]: optionIndex }))
    setSelectedCards((prev) => ({ ...prev, [question.id]: optionIndex }))
    setNotice('별의 선택이 기록되었어요! ✦')
    setSubmitting(null)
  }

  function getStatsForOption(questionId: string, optionIndex: number) {
    return stats[questionId]?.find(
      (item) => Number(item.option_index) === optionIndex,
    )
  }

  function getTotalVotes(questionId: string) {
    return stats[questionId]?.[0]?.total_votes ?? 0
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEdit(question: QuizQuestion) {
    setEditingId(question.id)
    setForm({
      question: question.question,
      options: [...question.options],
      correctOption: answers[question.id] ?? 0,
      explanation: question.explanation || '',
      isPublished: question.is_published,
      orderIndex: question.order_index,
    })
    setAdminExpanded(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAdmin) return

    const questionText = form.question.trim()
    const options = form.options.map((option) => option.trim())

    if (!questionText) {
      setNotice('질문을 입력해주세요.')
      return
    }
    if (options.some((option) => !option)) {
      setNotice('네 개의 선택지를 모두 입력해주세요.')
      return
    }

    setSavingQuestion(true)
    setNotice('')

    let questionId = editingId

    if (editingId) {
      const { error } = await supabase
        .from('quiz_questions')
        .update({
          question: questionText,
          options,
          explanation: form.explanation.trim() || null,
          is_published: form.isPublished,
          order_index: Number(form.orderIndex) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)

      if (error) {
        setNotice(`문제 수정 실패: ${error.message}`)
        setSavingQuestion(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert({
          question: questionText,
          options,
          explanation: form.explanation.trim() || null,
          is_published: form.isPublished,
          is_revealed: false,
          order_index: Number(form.orderIndex) || 0,
        })
        .select('id')
        .single()

      if (error || !data) {
        setNotice(`문제 등록 실패: ${error?.message || '문제 ID를 받지 못했어요.'}`)
        setSavingQuestion(false)
        return
      }
      questionId = data.id
    }

    // 정답 저장/갱신
    const { error: answerError } = await supabase
      .from('quiz_answers')
      .upsert(
        { question_id: questionId, correct_option: Number(form.correctOption) },
        { onConflict: 'question_id' },
      )

    if (answerError) {
      setNotice(`문제는 저장됐지만 정답 저장 실패: ${answerError.message}`)
      setSavingQuestion(false)
      await loadQuestions()
      return
    }

    setNotice(editingId ? '퀴즈를 수정했어요! ✦' : '새로운 퀴즈를 등록했어요! ✦')
    resetForm()
    await loadQuestions()
    setSavingQuestion(false)
  }

  async function togglePublish(question: QuizQuestion) {
    if (!isAdmin) return
    const { error } = await supabase
      .from('quiz_questions')
      .update({ is_published: !question.is_published })
      .eq('id', question.id)

    if (error) setNotice(`공개 설정 실패: ${error.message}`)
    else {
      setNotice(question.is_published ? '퀴즈를 비공개로 변경했어요.' : '퀴즈를 공개했어요!')
      await loadQuestions()
    }
  }

  async function toggleReveal(question: QuizQuestion) {
    if (!isAdmin) return

    const next = !question.is_revealed
    const confirmed = window.confirm(
      next
        ? '이 문제의 정답을 공개할까요? 공개 후 참여자에게 정답이 보여요.'
        : '정답 공개를 취소할까요?',
    )
    if (!confirmed) return

    const { error } = await supabase
      .from('quiz_questions')
      .update({ is_revealed: next })
      .eq('id', question.id)

    if (error) {
      setNotice(`정답 공개 설정 실패: ${error.message}`)
      return
    }

    setNotice(next ? '정답을 공개했어요!' : '정답 공개를 취소했어요.')
    if (next) await loadStats(question.id)
    await loadQuestions()
    await loadLeaderboard()
  }

  async function deleteQuestion(question: QuizQuestion) {
    if (!isAdmin) return
    const confirmed = window.confirm(
      `「${question.question}」을(를) 삭제할까요?\n투표 기록과 정답도 함께 삭제될 수 있어요.`,
    )
    if (!confirmed) return

    // 관련 기록을 먼저 삭제
    const { error: voteError } = await supabase
      .from('quiz_votes')
      .delete()
      .eq('question_id', question.id)

    if (voteError) {
      setNotice(`투표 기록 삭제 실패: ${voteError.message}`)
      return
    }

    const { error: answerError } = await supabase
      .from('quiz_answers')
      .delete()
      .eq('question_id', question.id)

    if (answerError) {
      setNotice(`정답 삭제 실패: ${answerError.message}`)
      return
    }

    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', question.id)

    if (error) {
      setNotice(`문제 삭제 실패: ${error.message}`)
      return
    }

    setNotice('퀴즈를 삭제했어요.')
    await loadQuestions()
    await loadLeaderboard()
  }

  if (!hasSupabase) {
    return (
      <section className="star-quiz-page">
        <div className="star-quiz-empty">
          <Sparkles size={32} />
          <h2>별의 연결이 필요해요</h2>
          <p>Supabase 환경설정을 확인해주세요.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="star-quiz-page">
      <header className="star-quiz-header">
        <div className="star-quiz-eyebrow">
          <Star size={14} fill="currentColor" /> A STAR FOR US
        </div>
        <h1>STAR QUIZ</h1>
        <p className="star-quiz-subtitle">별의 기억을 따라, 뽀실이를 알아가는 시간</p>

        {nickname && (
          <div className="star-quiz-nickname">
            <Sparkles size={14} />
            {nickname} 꾸질이
            <button type="button" onClick={() => setNicknameOpen(true)} title="닉네임 변경">
              변경
            </button>
          </div>
        )}

        <nav className="star-quiz-tabs">
          <button
            type="button"
            className={activeTab === 'quiz' ? 'active' : ''}
            onClick={() => setActiveTab('quiz')}
          >
            <Star size={15} /> 별의 퀴즈
          </button>
          <button
            type="button"
            className={activeTab === 'ranking' ? 'active' : ''}
            onClick={() => setActiveTab('ranking')}
          >
            <Trophy size={15} /> 명예의 전당
          </button>
        </nav>
      </header>

      {notice && (
        <div className="star-quiz-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice('')}>닫기</button>
        </div>
      )}

      {/* 관리자 전용 등록 패널 */}
      {isAdmin && (
        <section className="star-quiz-admin-panel">
          <button
            type="button"
            className="star-quiz-admin-toggle"
            onClick={() => setAdminExpanded((value) => !value)}
          >
            <span><LockKeyhole size={17} /> STAR QUIZ 관리자 · 문제 관리</span>
            {adminExpanded ? <X size={17} /> : <Plus size={17} />}
          </button>

          {adminExpanded && (
            <form className="star-quiz-admin-form" onSubmit={saveQuestion}>
              <div className="star-quiz-admin-form-heading">
                <h2>{editingId ? '퀴즈 수정하기' : '새로운 퀴즈 등록'}</h2>
                {editingId && (
                  <button type="button" className="star-quiz-text-button" onClick={resetForm}>
                    <X size={14} /> 수정 취소
                  </button>
                )}
              </div>

              <label className="star-quiz-admin-label">
                질문
                <textarea
                  value={form.question}
                  onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                  placeholder="꾸질이들에게 낼 질문을 입력해주세요."
                  rows={3}
                  required
                />
              </label>

              <div className="star-quiz-admin-options">
                <p>선택지 4개 · 정답 선택</p>
                {form.options.map((option, index) => (
                  <div className="star-quiz-admin-option-row" key={index}>
                    <label className="star-quiz-admin-correct">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={form.correctOption === index}
                        onChange={() => setForm((prev) => ({ ...prev, correctOption: index }))}
                      />
                      <span>{String.fromCharCode(65 + index)}</span>
                    </label>
                    <input
                      value={option}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        options: prev.options.map((value, i) => i === index ? event.target.value : value),
                      }))}
                      placeholder={`선택지 ${index + 1}`}
                      required
                    />
                    {form.correctOption === index && <span className="star-quiz-admin-answer-mark"><Check size={14} /> 정답</span>}
                  </div>
                ))}
              </div>

              <label className="star-quiz-admin-label">
                정답 해설
                <textarea
                  value={form.explanation}
                  onChange={(event) => setForm((prev) => ({ ...prev, explanation: event.target.value }))}
                  placeholder="정답 공개 시 보여줄 해설 (선택)"
                  rows={3}
                />
              </label>

              <label className="star-quiz-admin-label">
                표시 순서
                <input
                  type="number"
                  value={form.orderIndex}
                  onChange={(event) => setForm((prev) => ({ ...prev, orderIndex: Number(event.target.value) }))}
                />
              </label>

              <label className="star-quiz-admin-publish">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))}
                />
                등록 즉시 공개하기
              </label>

              <button type="submit" className="star-quiz-primary-button" disabled={savingQuestion}>
                {savingQuestion ? <Sparkles size={16} /> : editingId ? <Check size={16} /> : <Plus size={16} />}
                {savingQuestion ? '저장 중...' : editingId ? '퀴즈 수정 저장' : '퀴즈 등록하기'}
              </button>
            </form>
          )}
        </section>
      )}

      {nicknameOpen && (
        <div className="star-quiz-modal-backdrop">
          <form className="star-quiz-nickname-modal" onSubmit={handleNicknameSubmit}>
            <div className="star-quiz-modal-icon"><Sparkles size={28} /></div>
            <p className="star-quiz-eyebrow">WELCOME, LITTLE STAR</p>
            <h2>꾸질이의 이름을 알려줘!</h2>
            <p>처음 한 번만 등록하면 다음에도 자동으로 기억할게.</p>
            <input
              autoFocus
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              placeholder="꾸질이 닉네임 (2~20자)"
              maxLength={20}
            />
            <button className="star-quiz-primary-button" type="submit">
              <Star size={16} /> 별의 이름 등록하기
            </button>
            {nickname && (
              <button
                className="star-quiz-text-button"
                type="button"
                onClick={() => { setNicknameOpen(false); setNicknameInput('') }}
              >
                취소
              </button>
            )}
          </form>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="star-quiz-content">
          {loading ? (
            <div className="star-quiz-empty">
              <Sparkles className="star-quiz-loading-star" size={28} />
              <p>별의 기억을 불러오는 중...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="star-quiz-empty">
              <Star size={32} />
              <h2>{isAdmin ? '아직 등록된 퀴즈가 없어요' : '아직 펼쳐지지 않은 별의 카드'}</h2>
              <p>{isAdmin ? '위 관리자 패널에서 첫 퀴즈를 등록해주세요!' : '뽀실이가 새로운 퀴즈를 준비하고 있어요!'}</p>
            </div>
          ) : (
            questions.map((question, questionIndex) => {
              const votedOption = myVotes[question.id]
              const isVoted = votedOption !== undefined
              const isRevealed = question.is_revealed
              const options = Array.isArray(question.options) ? question.options : []

              return (
                <article className="star-quiz-question" key={question.id}>
                  <div className="star-quiz-question-top">
                    <span className="star-quiz-question-number">
                      STAR MEMORY · {String(questionIndex + 1).padStart(2, '0')}
                    </span>
                    {isRevealed ? (
                      <span className="star-quiz-status revealed"><Check size={13} /> 정답 공개</span>
                    ) : isVoted ? (
                      <span className="star-quiz-status voted"><Check size={13} /> 참여 완료</span>
                    ) : (
                      <span className="star-quiz-status waiting"><Sparkles size={13} /> 참여 가능</span>
                    )}
                  </div>

                  <h2 className="star-quiz-question-title">{question.question}</h2>
                  <p className="star-quiz-question-caption">
                    {isRevealed ? '별의 정답이 밝혀졌어요.' : isVoted ? '너의 선택이 별에 기록되었어.' : '네 개의 별 중 하나를 선택해줘.'}
                  </p>

                  <div className="star-quiz-cards">
                    {options.map((option, optionIndex) => {
                      const isSelected = selectedCards[question.id] === optionIndex || votedOption === optionIndex
                      const optionStats = getStatsForOption(question.id, optionIndex)
                      const percentage = optionStats && Number(optionStats.total_votes) > 0
                        ? Math.round((Number(optionStats.vote_count) / Number(optionStats.total_votes)) * 100)
                        : 0
                      const isCorrect = isRevealed && answers[question.id] === optionIndex

                      return (
                        <button
                          type="button"
                          key={`${question.id}-${optionIndex}`}
                          className={[
                            'star-quiz-card',
                            isSelected ? 'selected' : '',
                            isRevealed ? 'revealed' : '',
                            isVoted && !isSelected ? 'disabled-card' : '',
                          ].join(' ')}
                          onClick={() => {
                            if (isRevealed || isVoted || submitting) return
                            setSelectedCards((prev) => ({ ...prev, [question.id]: optionIndex }))
                          }}
                          disabled={isRevealed || isVoted || submitting === question.id}
                        >
                          <div className="star-quiz-card-inner">
                            <div className="star-quiz-card-front">
                              <div className="star-quiz-card-frame">
                                <div className="star-quiz-card-top"><span>{CARD_NAMES[optionIndex]}</span><Star size={13} /></div>
                                <div className="star-quiz-card-art">
                                  <span className="star-quiz-card-orbit orbit-one" />
                                  <span className="star-quiz-card-orbit orbit-two" />
                                  <span className="star-quiz-card-symbol">{CARD_SYMBOLS[optionIndex]}</span>
                                  <span className="star-quiz-card-small-star star-a">✦</span>
                                  <span className="star-quiz-card-small-star star-b">✧</span>
                                  <span className="star-quiz-card-small-star star-c">·</span>
                                </div>
                                <div className="star-quiz-card-option">{option}</div>
                                <div className="star-quiz-card-bottom"><span>✦</span><span>THE MEMORY OF STAR</span><span>✦</span></div>
                              </div>
                            </div>
                            <div className="star-quiz-card-back">
                              <div className="star-quiz-card-frame">
                                <div className="star-quiz-card-back-symbol">
                                  {isCorrect ? <Crown size={32} /> : <Star size={32} fill="currentColor" />}
                                </div>
                                <p>{isRevealed ? isCorrect ? 'THE ANSWER' : 'A STAR' : 'YOUR STAR'}</p>
                                <div className="star-quiz-card-back-option">{isRevealed ? option : '별의 선택'}</div>
                                {isCorrect && <span className="star-quiz-correct-label"><Check size={13} /> 정답</span>}
                              </div>
                            </div>
                          </div>
                          {isSelected && !isRevealed && <span className="star-quiz-card-selected-mark"><Check size={13} /> 선택한 카드</span>}
                          {isRevealed && optionStats && <span className="star-quiz-card-percentage">{percentage}% · {optionStats.vote_count}표</span>}
                        </button>
                      )
                    })}
                  </div>

                  {!isVoted && !isRevealed && (
                    <div className="star-quiz-vote-area">
                      <p>{selectedCards[question.id] !== undefined ? `「${options[selectedCards[question.id]]}」를 선택했어!` : '마음이 끌리는 카드를 골라줘.'}</p>
                      <button
                        type="button"
                        className="star-quiz-primary-button"
                        disabled={selectedCards[question.id] === undefined || submitting === question.id}
                        onClick={() => handleVote(question, selectedCards[question.id])}
                      >
                        {submitting === question.id ? <Sparkles size={16} /> : <Star size={16} />}
                        {submitting === question.id ? '별에 기록하는 중...' : '이 카드로 선택하기'}
                      </button>
                    </div>
                  )}

                  {isVoted && !isRevealed && (
                    <div className="star-quiz-voted-message"><Check size={17} /><span>참여 완료! 정답 공개를 기다려줘.</span></div>
                  )}

                  {isRevealed && (
                    <div className="star-quiz-result">
                      <div className="star-quiz-result-title"><Sparkles size={17} /> 별의 정답</div>
                      <p>{options[answers[question.id] ?? 0]}</p>
                      {question.explanation && (
                        <div className="star-quiz-explanation"><span>✦ 뽀실이의 해설 ✦</span><p>{question.explanation}</p></div>
                      )}
                      <div className="star-quiz-total-votes"><Users size={15} /> 총 {getTotalVotes(question.id)}명의 꾸질이가 참여했어요.</div>
                      <button type="button" className="star-quiz-text-button" onClick={() => loadStats(question.id)}><RotateCcw size={14} /> 통계 새로고침</button>
                    </div>
                  )}

                  {/* 관리자 통계 및 참여자 */}
                  {isAdmin && (
                    <div className="star-quiz-admin-results">
                      <h3><Users size={16} /> 관리자 통계 · 총 {getTotalVotes(question.id)}표</h3>
                      <div className="star-quiz-admin-stat-list">
                        {options.map((option, index) => {
                          const item = getStatsForOption(question.id, index)
                          const count = Number(item?.vote_count || 0)
                          const total = Number(item?.total_votes || 0)
                          const percent = total ? Math.round(count / total * 100) : 0
                          return (
                            <div className="star-quiz-admin-stat" key={index}>
                              <span>{String.fromCharCode(65 + index)}. {option}</span>
                              <strong>{count}표 · {percent}%</strong>
                            </div>
                          )
                        })}
                      </div>
                      <div className="star-quiz-admin-participants">
                        <button type="button" className="star-quiz-text-button" onClick={() => loadParticipants(question.id)}>
                          <Users size={14} /> 참여자 명단 불러오기 ({participants[question.id]?.length ?? 0})
                        </button>
                        {participants[question.id]?.map((person, index) => (
                          <div className="star-quiz-admin-person" key={`${person.voter_id}-${index}`}>
                            <span>{person.nickname}</span>
                            <span>{options[person.selected_option] ?? '선택지'}</span>
                            <small>{new Date(person.created_at).toLocaleString('ko-KR')}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 관리자 문제 관리 버튼 */}
                  {isAdmin && (
                    <div className="star-quiz-admin-question-actions">
                      <button type="button" onClick={() => startEdit(question)}><Pencil size={14} /> 수정</button>
                      <button type="button" onClick={() => togglePublish(question)}>
                        {question.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        {question.is_published ? '비공개' : '공개'}
                      </button>
                      <button type="button" onClick={() => toggleReveal(question)}>
                        {question.is_revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        {question.is_revealed ? '정답 공개 취소' : '정답 공개'}
                      </button>
                      <button type="button" className="danger" onClick={() => deleteQuestion(question)}><Trash2 size={14} /> 삭제</button>
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'ranking' && (
        <section className="star-quiz-ranking">
          <div className="star-quiz-ranking-heading"><Trophy size={28} /><h2>HALL OF FAME</h2><p>별의 기억을 가장 많이 맞힌 꾸질이들</p></div>
          {leaderboard.length === 0 ? (
            <div className="star-quiz-empty"><Star size={28} /><p>아직 명예의 전당이 비어 있어요.</p><p>정답 공개가 시작되면 랭킹이 쌓일 거예요!</p></div>
          ) : (
            <div className="star-quiz-ranking-list">
              {leaderboard.map((person) => (
                <div className={`star-quiz-ranking-item rank-${person.rank_number}`} key={`${person.rank_number}-${person.nickname}`}>
                  <div className="star-quiz-rank-number">{person.rank_number === 1 ? <Crown size={20} /> : String(person.rank_number).padStart(2, '0')}</div>
                  <div className="star-quiz-rank-name"><strong>{person.nickname}</strong><span>{person.correct_count}개 정답 · {person.total_count}회 참여</span></div>
                  <div className="star-quiz-rank-accuracy"><strong>{Number(person.accuracy).toFixed(1)}%</strong><span>정답률</span></div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="star-quiz-text-button" onClick={loadLeaderboard}><RotateCcw size={14} /> 랭킹 새로고침</button>
        </section>
      )}

      <footer className="star-quiz-footer"><LockKeyhole size={13} /> 너의 선택은 별의 기록으로 영원히 남아.</footer>
    </section>
  )
}
