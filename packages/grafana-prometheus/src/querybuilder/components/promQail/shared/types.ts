import { QuerySuggestion } from '../types';

export interface QuerySuggestionItemProps {
  suggestion: QuerySuggestion;
  onClick: (suggestion: QuerySuggestion) => void;
  onClickWithMod: (suggestion: QuerySuggestion) => void;
}

export interface QuerySuggestionContainerProps {
  suggestions: QuerySuggestion[];
  onSuggestionSelect: (suggestion: QuerySuggestion) => void;
  onSuggestionSelectWithMod: (suggestion: QuerySuggestion) => void;
}
