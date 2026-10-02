// The search form: a GET form to /search/ (results are the search page's main query). On the search
// page it shows the terms searched for.
import { esc } from '../html';
import { attrs, alignClass, styleDecls } from './style';
import type { Renderer } from '../env';

export const searchForm: Renderer = (b, env) => {
  const a = b.attrs;
  const id = `search-${b.id}`;
  const value = env.ctx.queried.kind === 'search' ? (env.ctx.queried.search ?? '') : '';
  const label = a.label || 'Search';
  const button = a.buttonText || 'Search';
  return (
    `<form ${attrs(['c-search-form', alignClass(a.width), a.showLabel ? null : 'has-hidden-label', a.className], styleDecls(a.style), { role: 'search', method: 'get', action: '/search/' })}>` +
    `<label class="c-search-form__label" for="${esc(id)}">${esc(label)}</label>` +
    `<div class="c-search-form__row">` +
    `<input class="c-search-form__input" type="search" id="${esc(id)}" name="q" value="${esc(value)}" placeholder="${esc(a.placeholder || 'Search the site')}" />` +
    `<button class="c-search-form__button" type="submit">${esc(button)}</button>` +
    `</div></form>`
  );
};

export const SEARCH_RENDERERS: Record<string, Renderer> = { 'search-form': searchForm };
