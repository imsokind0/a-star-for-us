
import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Save, X,
  Sparkles, Check, Star, Users, Trophy, ChevronDown,
  ChevronUp, RefreshCw,
} from 'lucide-react'
import { supabase, hasSupabase } from './lib/supabase'

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  explanation: string | null
  is_published: boolean
  is_revealed: boolean
  order_index: number
}

type Participant = {
  nickname: string
  selected_option: number
  voter_id: string
  created_at: string
}

const letters = ['A', 'B', 'C', 'D']

export default function StarQuizAdmin() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({})
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    id: '',
    question: '',
    options: ['', '', '', ''],
    correct_option: 0,
    explanation: '',
    is_published: false,
    is_revealed: false,
  })

  const loadQuestions = async () => {
    if (!hasSupabase) {
      setLoading(false)
      setNotice('Supabase 연결을 확인해 주세요.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('order_index')

    if (error) {
      setNotice(`문제를 불러오지 못했어요: ${error.message}`)
      setLoading(false)
      return
    }

    const list = (data || []).map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })) as QuizQuestion[]

    setQuestions(list)

    const answerMap: Record<string, number> = {}

    for (const q of list) {
      const { data: answer, error: answerError } = await supabase
        .rpc('quiz_question_answer', {
          p_question_id: q.id,
        })

      if (!answerError && answer !== null && answer !== undefined) {
        answerMap[q.id] = Number(answer)
      }
    }

    setAnswers(answerMap)
    setLoading(false)
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  const resetForm = () => {
    setForm({
      id: '',
      question: '',
      options: ['', '', '', ''],
      correct_option: 0,
      explanation: '',
      is_published: false,
      is_revealed: false,
    })
    setNotice('')
  }

  const editQuestion = (q: QuizQuestion) => {
    setForm({
      id: q.id,
      question: q.question,
      options: [...q.options, '', '', '', ''].slice(0, 4),
      correct_option: answers[q.id] ?? 0,
      explanation: q.explanation || '',
      is_published: q.is_published,
      is_revealed: q.is_revealed,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveQuestion = async (e: FormEvent) => {
    e.preventDefault()

    if (!hasSupabase) {
      setNotice('Supabase 연결을 확인해 주세요.')
      return
    }

    if (!form.question.trim()) {
      setNotice('질문을 입력해 주세요.')
      return
    }

    if (form.options.some(o => !o.trim())) {
      setNotice('4개의 선택지를 모두 입력해 주세요.')
      return
    }

    setSaving(true)
    setNotice('')

    const payload = {
      question: form.question.trim(),
      options: form.options.map(o => o.trim()),
      explanation: form.explanation.trim() || null,
      is_published: form.is_published,
      is_revealed: form.is_revealed,
      order_index: form.id
        ? questions.find(q => q.id === form.id)?.order_index ?? questions.length
        : questions.length,
    }

    let questionId = form.id

    if (form.id) {
      const { error } = await supabase
        .from('quiz_questions')
        .update(payload)
        .eq('id', form.id)

      if (error) {
        setNotice(`문제 수정 실패: ${error.message}`)
        setSaving(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(payload)
        .select('id')
        .single()

      if (error || !data) {
        setNotice(`문제 등록 실패: ${error?.message || '문제 ID를 확인할 수 없어요.'}`)
        setSaving(false)
        return
      }

      questionId = data.id
    }

    const { error: answerError } = await supabase
      .from('quiz_answers')
      .upsert({
        question_id: questionId,
        correct_option: form.correct_option,
      }, {
        onConflict: 'question_id',
      })

    if (answerError) {
      setNotice(`정답 저장 실패: ${answerError.message}`)
      setSaving(false)
      return
    }

    setNotice('문제를 저장했어요 ✦')
    resetForm()
    await loadQuestions()
    setSaving(false)
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('이 문제와 투표 기록을 삭제할까요?')) return

    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', id)

    if (error) {
      setNotice(`삭제 실패: ${error.message}`)
      return
    }

    setParticipants(v => {
      const next = { ...v }
      delete next[id]
      return next
    })

    setNotice('문제를 삭제했어요.')
    await loadQuestions()
  }

  const togglePublished = async (q: QuizQuestion) => {
    const { error } = await supabase
      .from('quiz_questions')
      .update({ is_published: !q.is_published })
      .eq('id', q.id)

    if (error) {
      setNotice(`공개 상태 변경 실패: ${error.message}`)
      return
    }

    await loadQuestions()
  }

  const toggleRevealed = async (q: QuizQuestion) => {
    const { error } = await supabase
      .from('quiz_questions')
      .update({ is_revealed: !q.is_revealed })
      .eq('id', q.id)

    if (error) {
      setNotice(`정답 공개 변경 실패: ${error.message}`)
      return
    }

    await loadQuestions()
  }

  const loadParticipants = async (questionId: string) => {
    setLoadingStats(v => ({ ...v, [questionId]: true }))

    const { data, error } = await supabase
      .rpc('quiz_admin_participants', {
        p_question_id: questionId,
      })

    if (error) {
      setNotice(`참여자 조회 실패: ${error.message}`)
      setLoadingStats(v => ({ ...v, [questionId]: false }))
      return
    }

    setParticipants(v => ({
      ...v,
      [questionId]: (data || []) as Participant[],
    }))

    setLoadingStats(v => ({ ...v, [questionId]: false }))
  }

  const toggleStats = async (questionId: string) => {
    const isOpen = !!expanded[questionId]

    setExpanded(v => ({ ...v, [questionId]: !isOpen }))

    if (!isOpen && !participants[questionId]) {
      await loadParticipants(questionId)
    }
  }

  const getStats = (q: QuizQuestion) => {
    const voters = participants[q.id] || []
    const total = voters.length
    const correct = answers[q.id]

    const optionCounts = q.options.map((_, index) =>
      voters.filter(v => Number(v.selected_option) === index).length
    )

    const correctCount = correct === undefined
      ? 0
      : voters.filter(v => Number(v.selected_option) === correct).length

    return {
      total,
      optionCounts,
      correctCount,
      accuracy: total > 0 ? (correctCount / total) * 100 : 0,
    }
  }

  return (
    <div className="sqa-admin">
      {/* 상단 */}
      <header className="sqa-editor-header">
        <div className="sqa-editor-title">
          <div className="sqa-editor-title-icon">
            <Sparkles size={23} />
          </div>
          <div>
            <span className="sqa-eyebrow">STAR QUIZ CONTROL</span>
            <h2>별빛 퀴즈 관리</h2>
            <p>꾸질단과 함께할 별빛 질문을 만들어 보세요.</p>
          </div>
        </div>
        <div className="sqa-editor-header-decoration">✦ ✧</div>
      </header>

      {/* 요약 */}
      <div className="sqa-editor-overview">
        <div className="sqa-overview-item">
          <span className="sqa-overview-icon"><Star size={17} /></span>
          <div><small>전체 질문</small><strong>{questions.length}</strong></div>
        </div>
        <div className="sqa-overview-item">
          <span className="sqa-overview-icon"><Eye size={17} /></span>
          <div><small>공개 질문</small><strong>{questions.filter(q => q.is_published).length}</strong></div>
        </div>
        <div className="sqa-overview-item">
          <span className="sqa-overview-icon"><Check size={17} /></span>
          <div><small>정답 공개</small><strong>{questions.filter(q => q.is_revealed).length}</strong></div>
        </div>
      </div>

      {/* 작성 */}
      <section className="sqa-editor-panel">
        <div className="sqa-editor-panel-heading">
          <div>
            <span className="sqa-eyebrow">{form.id ? 'EDIT QUESTION' : 'NEW QUESTION'}</span>
            <h3>{form.id ? '질문 수정하기' : '새로운 별빛 질문'}</h3>
            <p>질문과 네 가지 선택지를 작성해 주세요.</p>
          </div>
          <span className="sqa-editor-mode">{form.id ? '수정 중' : '새 질문'}</span>
        </div>

        <form className="sqa-editor-form" onSubmit={saveQuestion}>
          {/* 질문 */}
          <div className="sqa-editor-field">
            <div className="sqa-editor-label">
              <span className="sqa-editor-step">01</span>
              <label htmlFor="sqa-question">질문 내용</label>
              <span className="sqa-editor-hint">QUIZ QUESTION</span>
            </div>
            <textarea
              id="sqa-question"
              className="sqa-editor-question-input"
              value={form.question}
              onChange={e => setForm(v => ({ ...v, question: e.target.value }))}
              placeholder="꾸질단에게 물어볼 질문을 입력해 주세요."
              rows={4}
              required
            />
          </div>

          {/* 선택지 */}
          <div className="sqa-editor-field">
            <div className="sqa-editor-label">
              <span className="sqa-editor-step">02</span>
              <label>선택지</label>
              <span className="sqa-editor-hint">CHOOSE THE ANSWER</span>
            </div>
            <p className="sqa-editor-description">정답으로 지정할 선택지의 별 버튼을 눌러 주세요.</p>

            <div className="sqa-editor-options">
              {form.options.map((option, i) => (
                <div
                  key={i}
                  className={`sqa-editor-option ${form.correct_option === i ? 'selected' : ''}`}
                >
                  <div className="sqa-editor-option-head">
                    <span className="sqa-editor-option-letter">{letters[i]}</span>
                    {form.correct_option === i && (
                      <span className="sqa-editor-answer-badge"><Check size={12} /> 정답</span>
                    )}
                  </div>
                  <input
                    value={option}
                    onChange={e =>
                      setForm(v => ({
                        ...v,
                        options: v.options.map((o, j) => j === i ? e.target.value : o),
                      }))
                    }
                    placeholder={`${letters[i]} 선택지 내용을 입력해 주세요`}
                    aria-label={`${letters[i]} 선택지`}
                    required
                  />
                  <button
                    type="button"
                    className={`sqa-editor-answer-button ${form.correct_option === i ? 'active' : ''}`}
                    onClick={() => setForm(v => ({ ...v, correct_option: i }))}
                  >
                    <Star size={15} fill={form.correct_option === i ? 'currentColor' : 'none'} />
                    {form.correct_option === i ? '정답으로 지정됨' : '정답으로 지정'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 해설 */}
          <div className="sqa-editor-field">
            <div className="sqa-editor-label">
              <span className="sqa-editor-step">03</span>
              <label htmlFor="sqa-explanation">정답 해설</label>
              <span className="sqa-editor-hint">EXPLANATION</span>
            </div>
            <textarea
              id="sqa-explanation"
              className="sqa-editor-explanation-input"
              value={form.explanation}
              onChange={e => setForm(v => ({ ...v, explanation: e.target.value }))}
              placeholder="정답 공개 후 보여줄 해설을 작성해 주세요. (선택 사항)"
              rows={4}
            />
          </div>

          {/* 설정 */}
          <div className="sqa-editor-field">
            <div className="sqa-editor-label">
              <span className="sqa-editor-step">04</span>
              <label>공개 설정</label>
              <span className="sqa-editor-hint">VISIBILITY</span>
            </div>

            <div className="sqa-editor-settings">
              <label className={`sqa-editor-setting ${form.is_published ? 'on' : ''}`}>
                <span className="sqa-editor-setting-icon"><Eye size={18} /></span>
                <span className="sqa-editor-setting-copy">
                  <strong>문제 공개</strong>
                  <small>시청자가 퀴즈에 참여할 수 있어요.</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={e => setForm(v => ({ ...v, is_published: e.target.checked }))}
                />
                <span className="sqa-editor-toggle" />
              </label>

              <label className={`sqa-editor-setting ${form.is_revealed ? 'on' : ''}`}>
                <span className="sqa-editor-setting-icon"><Sparkles size={18} /></span>
                <span className="sqa-editor-setting-copy">
                  <strong>정답 공개</strong>
                  <small>정답과 해설을 시청자에게 보여줘요.</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_revealed}
                  onChange={e => setForm(v => ({ ...v, is_revealed: e.target.checked }))}
                />
                <span className="sqa-editor-toggle" />
              </label>
            </div>
          </div>

          {/* 저장 */}
          <div className="sqa-editor-submit-area">
            <div className="sqa-editor-submit-copy">
              <Sparkles size={15} />
              <span>{form.id ? '수정한 내용을 저장해 주세요.' : '새로운 별빛 질문을 등록해 주세요.'}</span>
            </div>
            <div className="sqa-editor-submit-buttons">
              <button className="sqa-editor-save" type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? '저장 중...' : form.id ? '수정 내용 저장' : '별빛 질문 등록'}
              </button>
              {form.id && (
                <button type="button" className="sqa-editor-cancel" onClick={resetForm}>
                  <X size={16} /> 수정 취소
                </button>
              )}
            </div>
          </div>

          {notice && (
            <div className="sqa-editor-notice">
              <Sparkles size={16} />
              <span>{notice}</span>
            </div>
          )}
        </form>
      </section>

      {/* 목록 */}
      <section className="sqa-editor-panel sqa-editor-list-panel">
        <div className="sqa-editor-panel-heading">
          <div>
            <span className="sqa-eyebrow">YOUR CONSTELLATIONS</span>
            <h3>등록된 질문 <span className="sqa-editor-count">{questions.length}</span></h3>
            <p>등록한 질문과 참여 통계를 관리할 수 있어요.</p>
          </div>
          <span className="sqa-editor-mode"><Star size={14} /> LIST</span>
        </div>

        {loading ? (
          <div className="sqa-editor-empty"><RefreshCw size={23} /><p>별빛 질문을 불러오는 중...</p></div>
        ) : questions.length === 0 ? (
          <div className="sqa-editor-empty"><Star size={26} /><p>아직 등록된 질문이 없어요.</p><span>첫 번째 별빛 질문을 만들어 보세요.</span></div>
        ) : (
          <div className="sqa-editor-question-list">
            {questions.map((q, i) => {
              const stats = getStats(q)
              const isExpanded = !!expanded[q.id]

              return (
                <article className="sqa-editor-question-card" key={q.id}>
                  <div className="sqa-editor-question-top">
                    <span className="sqa-editor-question-number">✦ QUESTION {String(i + 1).padStart(2, '0')}</span>
                    <div className="sqa-editor-statuses">
                      <span className={q.is_published ? 'published' : ''}>{q.is_published ? '공개 중' : '비공개'}</span>
                      <span className={q.is_revealed ? 'revealed' : ''}>{q.is_revealed ? '정답 공개' : '정답 미공개'}</span>
                    </div>
                  </div>

                  <h4>{q.question}</h4>

                  <div className="sqa-editor-list-options">
                    {q.options.map((o, j) => (
                      <div className={`sqa-editor-list-option ${answers[q.id] === j ? 'correct' : ''}`} key={j}>
                        <span>{letters[j]}</span>
                        <p>{o}</p>
                        {answers[q.id] === j && <Check size={14} />}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="sqa-editor-list-explanation"><Sparkles size={14} /><p>{q.explanation}</p></div>
                  )}

                  <div className="sqa-editor-question-actions">
                    <button type="button" onClick={() => togglePublished(q)}>
                      {q.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                      {q.is_published ? '비공개 전환' : '문제 공개'}
                    </button>
                    <button type="button" onClick={() => toggleRevealed(q)}>
                      {q.is_revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      {q.is_revealed ? '정답 숨기기' : '정답 공개'}
                    </button>
                    <button type="button" onClick={() => editQuestion(q)}><Pencil size={14} /> 수정</button>
                    <button type="button" className="delete" onClick={() => deleteQuestion(q.id)}><Trash2 size={14} /> 삭제</button>
                  </div>

                  <button type="button" className="sqa-editor-stats-button" onClick={() => toggleStats(q.id)}>
                    <span><Users size={16} /> 참여 통계 및 참여자 보기</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isExpanded && (
                    <div className="sqa-editor-stats">
                      {loadingStats[q.id] ? (
                        <div className="sqa-editor-empty"><RefreshCw size={20} /><p>참여 통계를 불러오는 중...</p></div>
                      ) : (
                        <>
                          <div className="sqa-editor-stat-cards">
                            <div><Users size={16} /><small>참여 인원</small><strong>{stats.total}</strong></div>
                            <div><Trophy size={16} /><small>정답자</small><strong>{stats.correctCount}</strong></div>
                            <div><Check size={16} /><small>정답률</small><strong>{stats.total > 0 ? `${stats.accuracy.toFixed(1)}%` : '-'}</strong></div>
                          </div>

                          <h5>선택지별 득표</h5>
                          {q.options.map((option, index) => {
                            const count = stats.optionCounts[index] || 0
                            const percent = stats.total > 0 ? (count / stats.total) * 100 : 0

                            return (
                              <div className="sqa-editor-vote-stat" key={index}>
                                <div className="sqa-editor-vote-top">
                                  <span>{letters[index]}. {option}{answers[q.id] === index && <strong> · 정답</strong>}</span>
                                  <span>{count}명 · {percent.toFixed(1)}%</span>
                                </div>
                                <div className="sqa-editor-vote-bar"><div style={{ width: `${percent}%` }} /></div>
                              </div>
                            )
                          })}

                          <h5>참여자 목록</h5>
                          {stats.total === 0 ? (
                            <p className="sqa-editor-no-participants">아직 참여자가 없어요.</p>
                          ) : (
                            <div className="sqa-editor-participants">
                              {participants[q.id].map((p, index) => {
                                const selected = Number(p.selected_option)
                                const isCorrect = answers[q.id] === selected

                                return (
                                  <div className="sqa-editor-participant" key={`${p.voter_id}-${index}`}>
                                    <div><strong>{p.nickname || '이름 없음'}</strong><small>{p.created_at ? new Date(p.created_at).toLocaleString('ko-KR') : ''}</small></div>
                                    <span className={isCorrect ? 'correct' : ''}>{letters[selected] || '?'} 선택 {isCorrect && <Check size={13} />}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
