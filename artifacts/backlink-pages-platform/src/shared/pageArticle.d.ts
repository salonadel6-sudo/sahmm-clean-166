export type ArticlePage = {
  title: string;
  category: string;
  url: string;
};

export type PageArticle = {
  heading: string;
  paragraphs: string[];
  keywordLinks: {
    token: string;
    label: string;
    url: string;
  }[];
};

export function buildPageArticle(page: ArticlePage): PageArticle;