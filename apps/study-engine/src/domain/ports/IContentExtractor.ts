export interface ExtractTextInput {
  mimeType?: string;
  fileName?: string;
  fileBase64?: string;
  textContent?: string;
}

export interface IContentExtractor {
  extractText(input: ExtractTextInput): Promise<string>;
}
