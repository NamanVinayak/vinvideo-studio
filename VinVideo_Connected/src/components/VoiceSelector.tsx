import React, { useState, useEffect } from 'react';
import styles from './VoiceSelector.module.css';

export interface VoicePreference {
  mode: 'auto' | 'tags' | 'custom';
  tags?: string[];
  customDescription?: string;
}

interface VoiceSelectorProps {
  onVoicePreferenceChange: (preference: VoicePreference) => void;
  showVoiceOptions?: boolean;
  initialPreference?: VoicePreference;
  className?: string;
}

const PERSONALITY_TAGS = [
  'Chill & Laid-back',
  'Main Character Energy', 
  'Cozy Storyteller',
  'Boss Mode',
  'Soft & Dreamy',
  'Hype Beast',
  'Mysterious Vibes',
  'Bestie Energy', 
  'Professor Mode',
  'Dark Academia',
  'Sunshine Personality',
  'No Cap Confident'
] as const;

export default function VoiceSelector({ 
  onVoicePreferenceChange, 
  showVoiceOptions = true, 
  initialPreference,
  className = ''
}: VoiceSelectorProps) {
  const [voiceMode, setVoiceMode] = useState<'auto' | 'tags' | 'custom'>(
    initialPreference?.mode || 'auto'
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialPreference?.tags || []
  );
  const [customDescription, setCustomDescription] = useState(
    initialPreference?.customDescription || ''
  );

  // Update parent component when preferences change
  useEffect(() => {
    const preference: VoicePreference = { mode: voiceMode };
    
    if (voiceMode === 'tags' && selectedTags.length > 0) {
      preference.tags = selectedTags;
    } else if (voiceMode === 'custom' && customDescription.trim()) {
      preference.customDescription = customDescription.trim();
    }
    
    onVoicePreferenceChange(preference);
  }, [voiceMode, selectedTags, customDescription, onVoicePreferenceChange]);

  const handleModeChange = (mode: 'auto' | 'tags' | 'custom') => {
    setVoiceMode(mode);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
  };

  const handleCustomDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomDescription(e.target.value);
  };

  if (!showVoiceOptions) return null;

  return (
    <div className={`${styles.voiceSelectionContainer} ${className}`}>
      <h3 className={styles.sectionTitle}>Voice Style</h3>
      <p className={styles.sectionDescription}>
        Choose how you want the voice to be selected for your video
      </p>
      
      {/* Auto Option */}
      <label className={`${styles.voiceOption} ${voiceMode === 'auto' ? styles.selected : ''}`}>
        <input 
          type="radio" 
          name="voiceMode" 
          value="auto" 
          checked={voiceMode === 'auto'}
          onChange={() => handleModeChange('auto')}
          className={styles.radioInput}
        />
        <div className={styles.optionContent}>
          <span className={styles.optionIcon}>🤖</span>
          <div className={styles.optionText}>
            <strong>Auto (AI chooses based on content)</strong>
            <p className={styles.optionDescription}>
              Let our AI analyze your content and automatically select the perfect voice
            </p>
          </div>
        </div>
      </label>

      {/* Personality Tags Option */}
      <label className={`${styles.voiceOption} ${voiceMode === 'tags' ? styles.selected : ''}`}>
        <input 
          type="radio" 
          name="voiceMode" 
          value="tags"
          checked={voiceMode === 'tags'}
          onChange={() => handleModeChange('tags')}
          className={styles.radioInput}
        />
        <div className={styles.optionContent}>
          <span className={styles.optionIcon}>✨</span>
          <div className={styles.optionText}>
            <strong>Personality Vibes</strong>
            <p className={styles.optionDescription}>
              Choose from Gen-Z personality traits to find your perfect voice vibe
            </p>
          </div>
        </div>
      </label>
      
      {voiceMode === 'tags' && (
        <div className={styles.tagsContainer}>
          <p className={styles.tagsInstruction}>
            Select one or more personality vibes (you can mix and match!):
          </p>
          <div className={styles.tagsGrid}>
            {PERSONALITY_TAGS.map(tag => (
              <label 
                key={tag} 
                className={`${styles.tagCheckbox} ${selectedTags.includes(tag) ? styles.selectedTag : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                  className={styles.checkboxInput}
                />
                <span className={styles.tagLabel}>{tag}</span>
              </label>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <div className={styles.selectedTagsDisplay}>
              <strong>Selected vibes:</strong> {selectedTags.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Custom Description Option */}
      <label className={`${styles.voiceOption} ${voiceMode === 'custom' ? styles.selected : ''}`}>
        <input 
          type="radio" 
          name="voiceMode" 
          value="custom"
          checked={voiceMode === 'custom'}
          onChange={() => handleModeChange('custom')}
          className={styles.radioInput}
        />
        <div className={styles.optionContent}>
          <span className={styles.optionIcon}>💭</span>
          <div className={styles.optionText}>
            <strong>Custom Vibe</strong>
            <p className={styles.optionDescription}>
              Describe exactly what kind of voice you want in your own words
            </p>
          </div>
        </div>
      </label>
      
      {voiceMode === 'custom' && (
        <div className={styles.customDescriptionContainer}>
          <textarea 
            className={styles.customDescription}
            placeholder="Describe your perfect voice style... (e.g., 'warm and friendly like a good friend explaining something', 'professional but not boring', 'energetic and exciting')"
            maxLength={150}
            value={customDescription}
            onChange={handleCustomDescriptionChange}
            rows={3}
          />
          <div className={styles.characterCount}>
            {customDescription.length}/150 characters
          </div>
          {customDescription.trim() && (
            <div className={styles.customPreview}>
              <strong>Your description:</strong> "{customDescription.trim()}"
            </div>
          )}
        </div>
      )}

      {/* Voice Selection Summary */}
      {(voiceMode !== 'auto' && ((voiceMode === 'tags' && selectedTags.length > 0) || (voiceMode === 'custom' && customDescription.trim()))) && (
        <div className={styles.selectionSummary}>
          <p className={styles.summaryText}>
            ✨ Your voice preference will be considered along with content analysis to select the perfect voice!
          </p>
        </div>
      )}
    </div>
  );
}