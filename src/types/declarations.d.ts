declare module 'react-native-markdown-display' {
  import { ComponentType, ReactNode } from 'react';
  import { StyleProp, TextStyle, ViewStyle } from 'react-native';

  export interface MarkdownProps {
    children?: ReactNode;
    style?: Record<string, StyleProp<TextStyle | ViewStyle>>;
    rules?: Record<string, any>;
    [key: string]: any;
  }

  const Markdown: ComponentType<MarkdownProps>;
  export default Markdown;
}
