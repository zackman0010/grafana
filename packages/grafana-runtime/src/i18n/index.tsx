import { ReactElement } from 'react';

import { TFunction, Trans as I18NextTrans, i18n } from './types';

let tFunction: TFunction<string[], undefined> | undefined;
let transComponent: typeof Trans | undefined;
let i18nInstance: i18n;
type I18NextTransType = typeof I18NextTrans;
type I18NextTransProps = Parameters<I18NextTransType>[0];

interface TransProps extends I18NextTransProps {
  i18nKey: string;
}

export function setTFunction(tFunc: TFunction<string[], undefined>): void {
  // We allow overriding the registry in tests
  if (tFunction && process.env.NODE_ENV !== 'test') {
    throw new Error('setTFunction() function should only be called once, when Grafana is starting.');
  }
  tFunction = tFunc;
}

export function setTransComponent(transComp: typeof Trans): void {
  // We allow overriding the registry in tests
  if (transComponent && process.env.NODE_ENV !== 'test') {
    throw new Error('setTransComponent() function should only be called once, when Grafana is starting.');
  }
  transComponent = transComp;
}

export function setI18nInstance(i18nInst: i18n): void {
  // We allow overriding the registry in tests
  if (i18nInstance && process.env.NODE_ENV !== 'test') {
    throw new Error('setI18nInstance() function should only be called once, when Grafana is starting.');
  }
  i18nInstance = i18nInst;
}

export function t(id: string, defaultMessage: string, values?: Record<string, unknown>): string {
  if (!tFunction) {
    throw new Error('t(options) can only be used after the Grafana instance has started.');
  }
  return tFunction(id, defaultMessage, values);
}

export function Trans(props: TransProps): ReactElement {
  if (!transComponent) {
    throw new Error('<Trans {...props} /> can only be used after the Grafana instance has started.');
  }
  return transComponent(props);
}

export function i18nNext(): i18n {
  if (!i18nInstance) {
    throw new Error('i18nInstance can only be used after the Grafana instance has started.');
  }
  return i18nInstance;
}
