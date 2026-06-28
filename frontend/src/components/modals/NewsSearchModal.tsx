import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import { loadNewsData } from '../../services/marketAnnotationService'
import type { NewsEvent } from '../../types/chart'
import { fuzzyScore } from '../../utils/fuzzy'

type NewsSearchModalProps = {
    onClose: () => void
    onJumpToDate: (dateTime: string) => void
}

/** Renders a floating modal to search news events by name and navigate to event date.
 *
 * Args:
 *     onClose: Called when modal is dismissed (backdrop click or ×).
 *     onJumpToDate: Called with sort_key datetime string when user clicks Go on a result.
 *
 * Returns:
 *     The modal JSX element.
 */
function NewsSearchModal({ onClose, onJumpToDate }: NewsSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [allNews, setAllNews] = useState<NewsEvent[]>([])

    useEffect(() => {
        loadNewsData().then(setAllNews)
    }, [])

    const filteredNews = useMemo(() => {
        if (!searchQuery.trim()) return allNews
        const scored = allNews
            .map(n => ({ news: n, score: fuzzyScore(searchQuery, n.event) }))
            .filter(({ score }) => score > 0)
        scored.sort((a, b) => b.score - a.score)
        return scored.map(({ news }) => news)
    }, [allNews, searchQuery])

    const impactBadgeClass = (impact: string): string => {
        switch (impact) {
            case 'High':
                return 'news-impact news-impact--high'
            case 'Medium':
                return 'news-impact news-impact--medium'
            case 'Low':
                return 'news-impact news-impact--low'
            default:
                return 'news-impact'
        }
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <div className="modal-card modal-card--news" role="dialog" aria-modal="true" aria-label="Search news" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-card__header">
                    <div className="modal-card__title">Search News</div>
                    <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close search news">
                        &times;
                    </button>
                </div>

                <div className="modal-card__body">
                    <label className="modal-field">
                        <span className="modal-field__label">Search</span>
                        <input
                            type="text"
                            placeholder="Search news..."
                            value={searchQuery}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                        />
                    </label>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '12px' }}>
                        {filteredNews.map((news, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-color, #e0e0e0)' }}>
                                <span style={{ minWidth: '90px', fontSize: '0.85em' }}>{news.date}</span>
                                <span style={{ minWidth: '50px', fontSize: '0.85em' }}>{news.time}</span>
                                <span style={{ minWidth: '40px', fontSize: '0.85em' }}>{news.currency}</span>
                                <span className={impactBadgeClass(news.impact)} style={{ minWidth: '60px', textAlign: 'center' }}>
                                    {news.impact}
                                </span>
                                <span style={{ flex: 1, fontSize: '0.85em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {news.event}
                                </span>
                                <button
                                    type="button"
                                    className="modal-btn modal-btn--primary"
                                    style={{ padding: '2px 10px', fontSize: '0.8em' }}
                                    onClick={() => { onJumpToDate(news.sort_key); onClose() }}
                                >
                                    Go
                                </button>
                            </div>
                        ))}
                        {filteredNews.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                {allNews.length === 0 ? 'Loading news...' : 'No matching news events.'}
                            </div>
                        )}
                    </div>

                    <div className="modal-card__actions">
                        <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NewsSearchModal
