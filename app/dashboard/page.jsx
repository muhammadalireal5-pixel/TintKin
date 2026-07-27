import { getLatestData } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import RadarChartClient from "./RadarChartClient";

export default async function DashboardPage() {
    const { latestSelfie, realAge } = await getLatestData();
    if (!latestSelfie) redirect("/capture");

    const { overallScore, skinAge, scores } = latestSelfie;
    const skinOlder = skinAge > realAge;
    const ageDelta = skinAge - realAge;

    return (
        <div style={{
            minHeight: 'calc(100vh - 68px)',
            background: 'radial-gradient(ellipse at 70% 0%, rgba(193,51,131,0.15) 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, rgba(68,49,153,0.2) 0%, transparent 50%), var(--tk-bg)',
            padding: '40px 24px 60px',
        }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Page Title */}
                <div style={{ marginBottom: '36px', animation: 'fadeInUp 0.5s ease both' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--tk-text-faint)', marginBottom: '8px' }}>
                        Your Skin Report
                    </p>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800,
                        letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1,
                    }}>
                        Your Skin{' '}
                        <span className="tk-gradient-text">Today</span>
                    </h1>
                </div>

                {/* Age comparison */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px',
                    animation: 'fadeInUp 0.5s 0.1s ease both',
                }}>
                    {/* Real Age */}
                    <div className="tk-glass" style={{ borderRadius: '20px', padding: '28px 24px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tk-text-faint)', marginBottom: '10px' }}>
                            Real Age
                        </p>
                        <p style={{ fontSize: '52px', fontWeight: 800, margin: 0, lineHeight: 1, color: 'var(--tk-text-primary)' }}>
                            {realAge}
                        </p>
                    </div>

                    {/* Skin Age */}
                    <div
                        className={`tk-glass ${skinOlder ? 'tk-pulse-ring' : ''}`}
                        style={{
                            borderRadius: '20px', padding: '28px 24px',
                            borderColor: skinOlder ? 'rgba(224,84,84,0.35)' : 'rgba(52,211,153,0.35)',
                        }}
                    >
                        <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tk-text-faint)', marginBottom: '10px' }}>
                            Skin Age
                        </p>
                        <p style={{
                            fontSize: '52px', fontWeight: 800, margin: 0, lineHeight: 1,
                            color: skinOlder ? 'var(--tk-coral)' : '#34d399',
                        }}>
                            {skinAge}
                        </p>
                        <span style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '12px', fontWeight: 600,
                            background: skinOlder ? 'rgba(224,84,84,0.15)' : 'rgba(52,211,153,0.15)',
                            color: skinOlder ? 'var(--tk-coral)' : '#34d399',
                            border: `1px solid ${skinOlder ? 'rgba(224,84,84,0.3)' : 'rgba(52,211,153,0.3)'}`,
                        }}>
                            {skinOlder ? '+' : ''}{ageDelta} vs real age
                        </span>
                    </div>
                </div>

                {/* Overall Score */}
                <div className="tk-glass" style={{
                    borderRadius: '20px', padding: '32px 28px', marginBottom: '20px',
                    animation: 'fadeInUp 0.5s 0.15s ease both',
                    display: 'flex', alignItems: 'center', gap: '32px',
                    flexWrap: 'wrap',
                }}>
                    {/* Score ring */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                            <circle
                                cx="60" cy="60" r="52"
                                fill="none"
                                stroke="url(#scoreGrad)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${(overallScore / 100) * 327} 327`}
                                style={{ transition: 'stroke-dasharray 1s ease' }}
                            />
                            <defs>
                                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#E05454" />
                                    <stop offset="50%" stopColor="#C13383" />
                                    <stop offset="100%" stopColor="#792CA2" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1 }} className="tk-gradient-text">
                                {overallScore}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--tk-text-faint)', marginTop: '2px' }}>/100</span>
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tk-text-faint)', marginBottom: '6px' }}>
                            Overall Skin Score
                        </p>
                        <p style={{ fontSize: '42px', fontWeight: 800, margin: 0, lineHeight: 1 }} className="tk-gradient-text">
                            {overallScore}<span style={{ fontSize: '20px', fontWeight: 400, color: 'var(--tk-text-muted)' }}>/100</span>
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--tk-text-muted)', marginTop: '8px', margin: '8px 0 0' }}>
                            {overallScore >= 80 ? '✨ Excellent skin health' : overallScore >= 60 ? '💪 Good — keep it up' : '💧 Room to grow — stay consistent'}
                        </p>
                    </div>
                </div>

                {/* Score Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '14px', marginBottom: '20px',
                    animation: 'fadeInUp 0.5s 0.2s ease both',
                }}>
                    {Object.entries(scores).map(([key, val], i) => (
                        <div key={key} className="tk-glass" style={{ borderRadius: '16px', padding: '18px 16px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--tk-text-faint)', marginBottom: '10px' }}>
                                {key}
                            </p>
                            <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px', color: 'var(--tk-text-primary)' }}>{val}</p>
                            {/* Mini progress bar */}
                            <div style={{
                                height: '4px', borderRadius: '2px',
                                background: 'rgba(255,255,255,0.08)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${val}%`,
                                    borderRadius: '2px',
                                    background: `linear-gradient(90deg, #E05454, #C13383, #792CA2)`,
                                    transition: 'width 1s ease',
                                }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Radar Chart */}
                <div className="tk-glass" style={{
                    borderRadius: '20px', padding: '28px',
                    animation: 'fadeInUp 0.5s 0.25s ease both',
                }}>
                    <h2 style={{
                        fontSize: '18px', fontWeight: 700, marginBottom: '20px',
                        color: 'var(--tk-text-primary)',
                    }}>Skin Profile Radar</h2>
                    <RadarChartClient scores={scores} />
                </div>

            </div>
        </div>
    );
}