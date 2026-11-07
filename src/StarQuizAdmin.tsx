
import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Sparkles,
  Check,
  Star,
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

type QuizAnswer = {
  question_id: string
  correct_option: number
}

export default function StarQuizAdmin() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
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

    const { data: answerData } = await supabase
      .from('quiz_answers')
      .select('question_id, correct_option')

    const answerMap: Record<string, number> = {}

    ;(answerData || []).forEach((a: QuizAnswer) => {
      answerMap[a.question_id] = a.correct_option
    })

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

  return (
    <div className="sqa-admin">
      <div className="sqa-heading">
        <div className="sqa-heading-icon">
          <Sparkles size={24} />
        </div>
        <div>
          <span className="sqa-eyebrow">STAR QUIZ CONTROL</span>
          <h2>별빛 퀴즈 관리</h2>
          <p>꾸질단과 함께할 별빛 질문을 만들어 보세요.</p>
        </div>
      </div>

      <div className="sqa-summary">
        <div className="sqa-summary-card">
          <Star size={17} />
          <span>전체 질문</span>
          <strong>{questions.length}</strong>
        </div>
        <div className="sqa-summary-card">
          <Eye size={17} />
          <span>공개 질문</span>
          <strong>{questions.filter(q => q.is_published).length}</strong>
        </div>
        <div className="sqa-summary-card">
          <Check size={17} />
          <span>정답 공개</span>
          <strong>{questions.filter(q => q.is_revealed).length}</strong>
        </div>
      </div>

      <section className="sqa-panel">
        <div className="sqa-panel-heading">
          <div>
            <span className="sqa-eyebrow">
              {form.id ? 'EDIT CONSTELLATION' : 'CREATE CONSTELLATION'}
            </span>
            <h3>{form.id ? '질문 수정하기' : '새로운 별빛 질문'}</h3>
          </div>
          <div className="sqa-heading-badge">
            <Sparkles size={16} />
            {form.id ? 'EDIT' : 'NEW'}
          </div>
        </div>

        <form className="sqa-form" onSubmit={saveQuestion}>
          <div className="sqa-field">
            <label htmlFor="sqa-question">질문 내용</label>
            <textarea
              id="sqa-question"
              value={form.question}
              onChange={e => setForm(v => ({ ...v, question: e.target.value }))}
              placeholder="꾸질단에게 물어볼 질문을 입력해 주세요..."
              rows={3}
              required
            />
          </div>

          <div className="sqa-field">
            <div className="sqa-label-row">
              <label>선택지 4개</label>
              <span>정답으로 지정할 카드를 선택하세요.</span>
            </div>

            <div className="sqa-options">
              {form.options.map((option, i) => (
                <label
                  key={i}
                  className={`sqa-option ${form.correct_option === i ? 'is-correct' : ''}`}
                >
                  <span className="sqa-option-top">
                    <span className="sqa-option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {form.correct_option === i && (
                      <span className="sqa-correct-chip">
                        <Check size={12} /> 정답
                      </span>
                    )}
                  </span>
                  <input
                    value={option}
                    onChange={e =>
                      setForm(v => ({
                        ...v,
                        options: v.options.map((o, j) =>
                          j === i ? e.target.value : o
                        ),
                      }))
                    }
                    placeholder={`선택지 ${i + 1}을 입력해 주세요`}
                    required
                  />
                  <span className="sqa-option-select">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={form.correct_option === i}
                      onChange={() => setForm(v => ({ ...v, correct_option: i }))}
                    />
                    정답으로 선택
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="sqa-field">
            <label htmlFor="sqa-explanation">정답 해설</label>
            <textarea
              id="sqa-explanation"
              value={form.explanation}
              onChange={e => setForm(v => ({ ...v, explanation: e.target.value }))}
              placeholder="정답 공개 후 보여줄 해설을 입력해 주세요..."
              rows={3}
            />
          </div>

          <div className="sqa-setting-box">
            <label className="sqa-switch-row">
              <span className="sqa-switch-icon"><Eye size={17} /></span>
              <span className="sqa-switch-text">
                <strong>문제 공개</strong>
                <small>시청자가 퀴즈에 참여할 수 있어요.</small>
              </span>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={e => setForm(v => ({ ...v, is_published: e.target.checked }))}
              />
              <span className="sqa-switch-ui" />
            </label>

            <label className="sqa-switch-row">
              <span className="sqa-switch-icon"><Sparkles size={17} /></span>
              <span className="sqa-switch-text">
                <strong>정답 공개</strong>
                <small>정답과 해설을 시청자에게 보여줘요.</small>
              </span>
              <input
                type="checkbox"
                checked={form.is_revealed}
                onChange={e => setForm(v => ({ ...v, is_revealed: e.target.checked }))}
              />
              <span className="sqa-switch-ui" />
            </label>
          </div>

          <div className="sqa-form-actions">
            <button className="sqa-primary-button" type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? '저장 중...' : form.id ? '수정 내용 저장' : '별빛 질문 등록'}
            </button>

            {form.id && (
              <button type="button" className="sqa-secondary-button" onClick={resetForm}>
                <X size={16} /> 수정 취소
              </button>
            )}
          </div>

          {notice && (
            <div className="sqa-notice">
              <Sparkles size={15} />
              {notice}
            </div>
          )}
        </form>
      </section>

      <section className="sqa-panel sqa-list-panel">
        <div className="sqa-panel-heading">
          <div>
            <span className="sqa-eyebrow">YOUR CONSTELLATIONS</span>
            <h3>등록된 질문 <span className="sqa-count">{questions.length}</span></h3>
          </div>
          <div className="sqa-heading-badge">
            <Star size={16} /> LIST
          </div>
        </div>

        {loading ? (
          <div className="sqa-empty">
            <Sparkles size={25} />
            <p>별빛 질문을 불러오는 중...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="sqa-empty">
            <Star size={28} />
            <p>아직 등록된 질문이 없어요.</p>
            <span>첫 번째 별빛 질문을 만들어 보세요.</span>
          </div>
        ) : (
          <div className="sqa-question-list">
            {questions.map((q, i) => (
              <article className="sqa-question-card" key={q.id}>
                <div className="sqa-question-card-top">
                  <span className="sqa-question-number">
                    <Star size={12} /> QUESTION {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="sqa-statuses">
                    <span className={q.is_published ? 'published' : ''}>
                      {q.is_published ? '공개 중' : '비공개'}
                    </span>
                    <span className={q.is_revealed ? 'revealed' : ''}>
                      {q.is_revealed ? '정답 공개' : '정답 미공개'}
                    </span>
                  </div>
                </div>

                <h4>{q.question}</h4>

                <div className="sqa-list-options">
                  {q.options.map((o, j) => (
                    <div
                      className={`sqa-list-option ${answers[q.id] === j ? 'correct' : ''}`}
                      key={j}
                    >
                      <span>{String.fromCharCode(65 + j)}</span>
                      <p>{o}</p>
                      {answers[q.id] === j && <Check size={14} />}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="sqa-list-explanation">
                    <Sparkles size={14} />
                    <p>{q.explanation}</p>
                  </div>
                )}

                <div className="sqa-question-actions">
                  <button type="button" onClick={() => togglePublished(q)}>
                    {q.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                    {q.is_published ? '비공개 전환' : '문제 공개'}
                  </button>
                  <button type="button" onClick={() => toggleRevealed(q)}>
                    {q.is_revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    {q.is_revealed ? '정답 숨기기' : '정답 공개'}
                  </button>
                  <button type="button" onClick={() => editQuestion(q)}>
                    <Pencil size={14} /> 수정
                  </button>
                  <button type="button" className="delete" onClick={() => deleteQuestion(q.id)}>
                    <Trash2 size={14} /> 삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
