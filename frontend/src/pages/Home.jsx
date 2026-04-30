import SearchBar from '../components/SearchBar';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <span className="hero-label">AI-POWERED PRODUCT ANALYSIS</span>

        <h1 className="hero-headline">
          Don't trust the reviews.{'\n'}Trust the data.
        </h1>

        <p className="hero-subtext">
          {'Fake review detection. Real price comparison.\nYouTube reviewer analysis. In seconds.'}
        </p>

        <SearchBar />

        <div className="platform-badges">
          <div className="platform-badge-item">
            <span className="platform-dot" />
            <span>Amazon</span>
          </div>
          <div className="platform-badge-item">
            <span className="platform-dot" />
            <span>Flipkart</span>
          </div>
          <div className="platform-badge-item">
            <span className="platform-dot" />
            <span>Meesho</span>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="how-it-works-title">HOW IT WORKS</div>
        <div className="how-it-works-grid">
          <div className="card how-step">
            <div className="how-step-number">01</div>
            <div className="how-step-title">Paste link</div>
            <div className="how-step-desc">
              Paste any Amazon or Flipkart product URL to get started
            </div>
          </div>
          <div className="card how-step">
            <div className="how-step-number">02</div>
            <div className="how-step-title">AI analyzes</div>
            <div className="how-step-desc">
              We check 800+ reviews, prices, and YouTube videos
            </div>
          </div>
          <div className="card how-step">
            <div className="how-step-number">03</div>
            <div className="how-step-title">Get verdict</div>
            <div className="how-step-desc">
              Trust score, price comparison, buy decision — all in seconds
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
