import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a product link');
      return;
    }

    const isValid =
      trimmed.includes('amazon.in') ||
      trimmed.includes('amazon.com') ||
      trimmed.includes('flipkart.com') ||
      trimmed.includes('meesho.com');

    if (!isValid) {
      setError('Please paste an Amazon, Flipkart, or Meesho product link');
      return;
    }

    navigate(`/results?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="search-bar-container">
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          placeholder="Paste Amazon, Flipkart, or Meesho product link here"
          id="search-input"
        />
        <button type="submit" id="search-button">Analyze →</button>
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
}
