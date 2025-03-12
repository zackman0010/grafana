/* eslint-disable @typescript-eslint/no-explicit-any */
type $NormalizeIntoArray<T extends unknown | readonly unknown[]> = T extends readonly unknown[] ? T : [T];
type $NoInfer<A> = [A][A extends any ? 0 : never];
type $UnionToIntersection<T> = (T extends unknown ? (k: T) => void : never) extends (k: infer I) => void ? I : never;
type $StringKeyPathToRecordUnion<TPath extends string, TValue> = TPath extends `${infer TKey}.${infer Rest}`
  ? { [Key in TKey]: $StringKeyPathToRecord<Rest, TValue> }
  : { [Key in TPath]: TValue };
type $StringKeyPathToRecord<TPath extends string, TValue> = $UnionToIntersection<
  $StringKeyPathToRecordUnion<TPath, TValue>
>;
type $SpecialObject = object | Array<string | object>;
type $OmitArrayKeys<Arr> = Arr extends readonly any[] ? Omit<Arr, keyof any[]> : Arr;
type $Dictionary<T = unknown> = { [key: string]: T };
type $FirstNamespace<Ns extends Namespace> = Ns extends readonly any[] ? Ns[0] : Ns;
type $IsResourcesDefined = [keyof _Resources] extends [never] ? false : true;
type $PreservedValue<Value, Fallback> = [Value] extends [never] ? Fallback : Value;
type $MergeBy<T, K> = Omit<T, keyof K> & K;

type FormatFunction = (
  value: any,
  format?: string,
  lng?: string,
  options?: InterpolationOptions & $Dictionary<any>
) => string;

interface InterpolationOptions {
  format?: FormatFunction;
  formatSeparator?: string;
  escape?(str: string): string;
  alwaysFormat?: boolean;
  escapeValue?: boolean;
  useRawValueToEscape?: boolean;
  prefix?: string;
  suffix?: string;
  prefixEscaped?: string;
  suffixEscaped?: string;
  unescapeSuffix?: string;
  unescapePrefix?: string;
  nestingPrefix?: string;
  nestingSuffix?: string;
  nestingPrefixEscaped?: string;
  nestingSuffixEscaped?: string;
  nestingOptionsSeparator?: string;
  defaultVariables?: { [index: string]: any };
  maxReplaces?: number;
  skipOnVariables?: boolean;
}

interface FallbackLngObjList {
  [language: string]: readonly string[];
}

type FallbackLng =
  | string
  | readonly string[]
  | FallbackLngObjList
  | ((code: string) => string | readonly string[] | FallbackLngObjList);

interface TOptionsBase {
  defaultValue?: unknown;
  count?: number;
  ordinal?: boolean;
  context?: unknown;
  replace?: any;
  lng?: string;
  lngs?: readonly string[];
  fallbackLng?: FallbackLng;
  ns?: Namespace;
  keySeparator?: false | string;
  nsSeparator?: false | string;
  returnObjects?: boolean;
  returnDetails?: boolean;
  joinArrays?: string;
  postProcess?: string | readonly string[];
  interpolation?: InterpolationOptions;
}

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

type $ValueIfResourcesDefined<Value, Fallback> = $IsResourcesDefined extends true ? Value : Fallback;
type Resources = $ValueIfResourcesDefined<_Resources, $Dictionary<string>>;

type WithOrWithoutPlural<Key> = _CompatibilityJSON extends 'v4'
  ? Key extends `${infer KeyWithoutOrdinalPlural}${_PluralSeparator}ordinal${_PluralSeparator}${PluralSuffix}`
    ? KeyWithoutOrdinalPlural | Key
    : Key extends `${infer KeyWithoutPlural}${_PluralSeparator}${PluralSuffix}`
      ? KeyWithoutPlural | Key
      : Key
  : Key;

type JoinKeys<K1, K2> = `${K1 & string}${_KeySeparator}${K2 & string}`;

type KeysBuilderWithReturnObjects<Res, Key = keyof Res> = Key extends keyof Res
  ? Res[Key] extends $Dictionary | readonly unknown[]
    ?
        | JoinKeys<Key, WithOrWithoutPlural<keyof $OmitArrayKeys<Res[Key]>>>
        | JoinKeys<Key, KeysBuilderWithReturnObjects<Res[Key]>>
    : never
  : never;

type KeysBuilderWithoutReturnObjects<Res, Key = keyof $OmitArrayKeys<Res>> = Key extends keyof Res
  ? Res[Key] extends $Dictionary | readonly unknown[]
    ? JoinKeys<Key, KeysBuilderWithoutReturnObjects<Res[Key]>>
    : Key
  : never;

type KeysBuilder<Res, WithReturnObjects> = $IsResourcesDefined extends true
  ? WithReturnObjects extends true
    ? keyof Res | KeysBuilderWithReturnObjects<Res>
    : KeysBuilderWithoutReturnObjects<Res>
  : string;

type KeysWithReturnObjects = {
  [Ns in FlatNamespace]: WithOrWithoutPlural<KeysBuilder<Resources[Ns], true>>;
};
type KeysWithoutReturnObjects = {
  [Ns in FlatNamespace]: WithOrWithoutPlural<KeysBuilder<Resources[Ns], false>>;
};

type ResourceKeys<WithReturnObjects = _ReturnObjects> = WithReturnObjects extends true
  ? KeysWithReturnObjects
  : KeysWithoutReturnObjects;

type KeysByTOptions<TOpt extends TOptions> = TOpt['returnObjects'] extends true ? ResourceKeys<true> : ResourceKeys;

type NsByTOptions<Ns extends Namespace, TOpt extends TOptions> = TOpt['ns'] extends Namespace ? TOpt['ns'] : Ns;

type TOptions<TInterpolationMap extends object = $Dictionary> = TOptionsBase & TInterpolationMap;

type ParseKeysByKeyPrefix<Keys, KPrefix> = KPrefix extends string
  ? Keys extends `${KPrefix}${_KeySeparator}${infer Key}`
    ? Key
    : never
  : Keys;

type AppendNamespace<Ns, Keys> = `${Ns & string}${_NsSeparator}${Keys & string}`;

type ParseKeysByNamespaces<Ns extends Namespace, Keys> =
  Ns extends ReadonlyArray<infer UnionNsps>
    ? UnionNsps extends keyof Keys
      ? AppendNamespace<UnionNsps, Keys[UnionNsps]>
      : never
    : never;

type ParseKeysByFallbackNs<Keys extends $Dictionary> = _FallbackNamespace extends false
  ? never
  : _FallbackNamespace extends Array<infer UnionFallbackNs extends string>
    ? Keys[UnionFallbackNs]
    : Keys[_FallbackNamespace & string];

type FilterKeysByContext<Keys, Context> = Context extends string
  ? Keys extends
      | `${infer Prefix}${_ContextSeparator}${Context}${_PluralSeparator}${PluralSuffix}`
      | `${infer Prefix}${_ContextSeparator}${Context}`
    ? Prefix
    : never
  : Keys;

type ParseKeys<
  Ns extends Namespace = DefaultNamespace,
  TOpt extends TOptions = {},
  KPrefix = undefined,
  Keys extends $Dictionary = KeysByTOptions<TOpt>,
  ActualNS extends Namespace = NsByTOptions<Ns, TOpt>,
  Context extends TOpt['context'] = TOpt['context'],
> = $IsResourcesDefined extends true
  ? FilterKeysByContext<
      | ParseKeysByKeyPrefix<Keys[$FirstNamespace<ActualNS>], KPrefix>
      | ParseKeysByNamespaces<ActualNS, Keys>
      | ParseKeysByFallbackNs<Keys>,
      Context
    >
  : string;

interface CustomTypeOptions {}

type TypeOptions = $MergeBy<
  {
    returnNull: false;
    returnEmptyString: true;
    returnObjects: false;
    keySeparator: '.';
    nsSeparator: ':';
    pluralSeparator: '_';
    contextSeparator: '_';
    defaultNS: 'translation';
    fallbackNS: false;
    compatibilityJSON: 'v4';
    resources: object;
    allowObjectInHTMLChildren: false;
    strictKeyChecks: false;
    interpolationPrefix: '{{';
    interpolationSuffix: '}}';
    unescapePrefix: '-';
    unescapeSuffix: '';
  },
  CustomTypeOptions
>;

type _ReturnObjects = TypeOptions['returnObjects'];
type _ReturnEmptyString = TypeOptions['returnEmptyString'];
type _ReturnNull = TypeOptions['returnNull'];
type _KeySeparator = TypeOptions['keySeparator'];
type _NsSeparator = TypeOptions['nsSeparator'];
type _PluralSeparator = TypeOptions['pluralSeparator'];
type _ContextSeparator = TypeOptions['contextSeparator'];
type _FallbackNamespace = TypeOptions['fallbackNS'];
type _Resources = TypeOptions['resources'];
type _CompatibilityJSON = TypeOptions['compatibilityJSON'];
type _InterpolationPrefix = TypeOptions['interpolationPrefix'];
type _InterpolationSuffix = TypeOptions['interpolationSuffix'];
type _UnescapePrefix = TypeOptions['unescapePrefix'];
type _UnescapeSuffix = TypeOptions['unescapeSuffix'];
type _StrictKeyChecks = TypeOptions['strictKeyChecks'];

type FlatNamespace = $PreservedValue<keyof TypeOptions['resources'], string>;
type Namespace<T = FlatNamespace> = T | readonly T[];
type DefaultNamespace = TypeOptions['defaultNS'];

type ParseTReturnPlural<Res, Key, KeyWithPlural = `${Key & string}${_PluralSeparator}${PluralSuffix}`> = Res[(
  | KeyWithPlural
  | Key
) &
  keyof Res];

type ParseTReturnPluralOrdinal<
  Res,
  Key,
  KeyWithOrdinalPlural = `${Key & string}${_PluralSeparator}ordinal${_PluralSeparator}${PluralSuffix}`,
> = Res[(KeyWithOrdinalPlural | Key) & keyof Res];

type ParseTReturnWithFallback<Key, Val> = Val extends ''
  ? _ReturnEmptyString extends true
    ? ''
    : Key
  : Val extends null
    ? _ReturnNull extends true
      ? null
      : Key
    : Val;

type ParseTReturn<Key, Res, TOpt extends TOptions = {}> = ParseTReturnWithFallback<
  Key,
  Key extends `${infer K1}${_KeySeparator}${infer RestKey}`
    ? ParseTReturn<RestKey, Res[K1 & keyof Res], TOpt>
    : TOpt['count'] extends number
      ? TOpt['ordinal'] extends boolean
        ? ParseTReturnPluralOrdinal<Res, Key>
        : ParseTReturnPlural<Res, Key>
      : Res extends readonly unknown[]
        ? Key extends `${infer NKey extends number}`
          ? Res[NKey]
          : never
        : Res[Key & keyof Res]
>;

type TReturnOptionalNull = _ReturnNull extends true ? null : never;
type TReturnOptionalObjects<TOpt extends TOptions> = _ReturnObjects extends true
  ? $SpecialObject | string
  : TOpt['returnObjects'] extends true
    ? $SpecialObject
    : string;
type DefaultTReturn<TOpt extends TOptions> = TReturnOptionalObjects<TOpt> | TReturnOptionalNull;

type KeyWithContext<Key, TOpt extends TOptions> = TOpt['context'] extends string
  ? `${Key & string}${_ContextSeparator}${TOpt['context']}`
  : Key;

type TFunctionReturn<
  Ns extends Namespace,
  Key,
  TOpt extends TOptions,
  ActualNS extends Namespace = NsByTOptions<Ns, TOpt>,
  ActualKey = KeyWithContext<Key, TOpt>,
> = $IsResourcesDefined extends true
  ? ActualKey extends `${infer Nsp}${_NsSeparator}${infer RestKey}`
    ? ParseTReturn<RestKey, Resources[Nsp & keyof Resources], TOpt>
    : ParseTReturn<ActualKey, Resources[$FirstNamespace<ActualNS>], TOpt>
  : DefaultTReturn<TOpt>;

type TFunctionProcessReturnValue<Ret, DefaultValue> = Ret extends string | $SpecialObject | null
  ? Ret
  : [DefaultValue] extends [never]
    ? Ret
    : DefaultValue;

type TFunctionDetailedResult<T = string, TOpt extends TOptions = {}> = {
  usedKey: string;
  res: T;
  exactUsedKey: string;
  usedLng: string;
  usedNS: string;
  usedParams: InterpolationMap<T> & { count?: TOpt['count'] };
};

type TFunctionReturnOptionalDetails<Ret, TOpt extends TOptions> = TOpt['returnDetails'] extends true
  ? TFunctionDetailedResult<Ret, TOpt>
  : Ret;

interface TFunctionStrict<Ns extends Namespace = DefaultNamespace, KPrefix = undefined> {
  $TFunctionBrand: $IsResourcesDefined extends true ? `${$FirstNamespace<Ns>}` : never;
  <
    const Key extends ParseKeys<Ns, TOpt, KPrefix> | TemplateStringsArray,
    const TOpt extends TOptions,
    Ret extends TFunctionReturn<Ns, AppendKeyPrefix<Key, KPrefix>, TOpt>,
  >(
    key: Key | Key[],
    options?: TOpt & InterpolationMap<Ret>
  ): TFunctionReturnOptionalDetails<TFunctionProcessReturnValue<$NoInfer<Ret>, never>, TOpt>;
  <
    const Key extends ParseKeys<Ns, TOpt, KPrefix> | TemplateStringsArray,
    const TOpt extends TOptions,
    Ret extends TFunctionReturn<Ns, AppendKeyPrefix<Key, KPrefix>, TOpt>,
  >(
    key: Key | Key[],
    defaultValue: string,
    options?: TOpt & InterpolationMap<Ret>
  ): TFunctionReturnOptionalDetails<TFunctionProcessReturnValue<$NoInfer<Ret>, never>, TOpt>;
}

type AppendKeyPrefix<Key, KPrefix> = KPrefix extends string ? `${KPrefix}${_KeySeparator}${Key & string}` : Key;

type TrimSpaces<T extends string, Acc extends string = ''> = T extends `${infer Char}${infer Rest}`
  ? Char extends ' '
    ? TrimSpaces<Rest, Acc>
    : TrimSpaces<Rest, `${Acc}${Char}`>
  : T extends ''
    ? Acc
    : never;

type ParseActualValue<Ret> = Ret extends `${_UnescapePrefix}${infer ActualValue}${_UnescapeSuffix}`
  ? TrimSpaces<ActualValue>
  : Ret;

type ParseInterpolationValues<Ret> =
  Ret extends `${string}${_InterpolationPrefix}${infer Value}${_InterpolationSuffix}${infer Rest}`
    ?
        | (Value extends `${infer ActualValue},${string}` ? ParseActualValue<ActualValue> : ParseActualValue<Value>)
        | ParseInterpolationValues<Rest>
    : never;

type InterpolationMap<Ret> = $PreservedValue<
  $StringKeyPathToRecord<ParseInterpolationValues<Ret>, unknown>,
  Record<string, unknown>
>;

interface TFunctionNonStrict<Ns extends Namespace = DefaultNamespace, KPrefix = undefined> {
  $TFunctionBrand: $IsResourcesDefined extends true ? `${$FirstNamespace<Ns>}` : never;
  <
    const Key extends ParseKeys<Ns, TOpt, KPrefix> | TemplateStringsArray,
    const TOpt extends TOptions,
    Ret extends TFunctionReturn<Ns, AppendKeyPrefix<Key, KPrefix>, TOpt>,
    const ActualOptions extends TOpt & InterpolationMap<Ret> = TOpt & InterpolationMap<Ret>,
    DefaultValue extends string = never,
  >(
    ...args:
      | [key: Key | Key[], options?: ActualOptions]
      | [key: string | string[], options: TOpt & $Dictionary & { defaultValue: DefaultValue }]
      | [key: string | string[], defaultValue: DefaultValue, options?: TOpt & $Dictionary]
  ): TFunctionReturnOptionalDetails<TFunctionProcessReturnValue<$NoInfer<Ret>, DefaultValue>, TOpt>;
}

type TFunctionSignature<Ns extends Namespace = DefaultNamespace, KPrefix = undefined> = _StrictKeyChecks extends true
  ? TFunctionStrict<Ns, KPrefix>
  : TFunctionNonStrict<Ns, KPrefix>;

type _DefaultNamespace = TypeOptions['defaultNS'];

type TransChild = React.ReactNode | Record<string, unknown>;

type TransProps<
  Key extends ParseKeys<Ns, TOpt, KPrefix>,
  Ns extends Namespace = _DefaultNamespace,
  KPrefix = undefined,
  TContext extends string | undefined = undefined,
  TOpt extends TOptions & { context?: TContext } = { context: TContext },
  E = React.HTMLProps<HTMLDivElement>,
> = E & {
  children?: TransChild | readonly TransChild[];
  components?: readonly React.ReactElement[] | { readonly [tagName: string]: React.ReactElement };
  count?: number;
  context?: TContext;
  defaults?: string;
  i18n?: any;
  i18nKey?: Key | Key[];
  ns?: Ns;
  parent?: string | React.ComponentType<any> | null;
  tOptions?: TOpt;
  values?: {};
  shouldUnescape?: boolean;
  t?: TFunction<Ns, KPrefix>;
};

interface CustomInstanceExtensions {}
interface CustomPluginOptions {}

type KeyPrefix<Ns extends Namespace> = ResourceKeys<true>[$FirstNamespace<Ns>] | undefined;

type PluginOptions<T> = $MergeBy<
  {
    detection?: object;
    backend?: T;
    cache?: object;
    i18nFormat?: object;
  },
  CustomPluginOptions
>;

interface ReactOptions {
  nsMode?: 'default' | 'fallback';
  defaultTransParent?: string;
  bindI18n?: string | false;
  bindI18nStore?: string | false;
  transEmptyNodeValue?: string;
  useSuspense?: boolean;
  hashTransKey?(defaultValue: TOptionsBase['defaultValue']): TOptionsBase['defaultValue'];
  transSupportBasicHtmlNodes?: boolean;
  transKeepBasicHtmlNodesFor?: readonly string[];
  transWrapTextNodes?: string;
  keyPrefix?: string;
  unescape?(str: string): string;
}

interface InitOptions<T = object> extends PluginOptions<T> {
  debug?: boolean;
  resources?: Resource;
  partialBundledLanguages?: boolean;
  lng?: string;
  fallbackLng?: false | FallbackLng;
  supportedLngs?: false | readonly string[];
  nonExplicitSupportedLngs?: boolean;
  load?: 'all' | 'currentOnly' | 'languageOnly';
  preload?: false | readonly string[];
  lowerCaseLng?: boolean;
  cleanCode?: boolean;
  ns?: string | readonly string[];
  defaultNS?: string | false | readonly string[];
  fallbackNS?: false | string | readonly string[];
  saveMissing?: boolean;
  saveMissingPlurals?: boolean;
  updateMissing?: boolean;
  saveMissingTo?: 'current' | 'all' | 'fallback';
  missingKeyNoValueFallbackToKey?: boolean;
  missingKeyHandler?:
    | false
    | ((
        lngs: readonly string[],
        ns: string,
        key: string,
        fallbackValue: string,
        updateMissing: boolean,
        options: unknown
      ) => void);
  parseMissingKeyHandler?(key: string, defaultValue?: string): unknown;
  appendNamespaceToMissingKey?: boolean;
  missingInterpolationHandler?: (text: string, value: unknown, options: InitOptions) => unknown;
  simplifyPluralSuffix?: boolean;
  postProcess?: false | string | readonly string[];
  postProcessPassResolved?: boolean;
  returnNull?: boolean;
  returnEmptyString?: boolean;
  returnObjects?: boolean;
  returnDetails?: boolean;
  returnedObjectHandler?(key: string, value: string, options: unknown): void;
  joinArrays?: false | string;
  overloadTranslationOptionHandler?(args: string[]): TOptions;
  interpolation?: InterpolationOptions;
  react?: ReactOptions;
  initAsync?: boolean;
  initImmediate?: boolean;
  keySeparator?: false | string;
  nsSeparator?: false | string;
  pluralSeparator?: string;
  contextSeparator?: string;
  appendNamespaceToCIMode?: boolean;
  compatibilityJSON?: 'v4';
  locizeLastUsed?: {
    projectId: string;
    apiKey?: string;
    referenceLng?: string;
    version?: string;
    debounceSubmit?: number;
    allowedHosts?: readonly string[];
  };
  ignoreJSONStructure?: boolean;
  maxParallelReads?: number;
  maxRetries?: number;
  retryTimeout?: number;
}

type Callback = (error: any, t: TFunction) => void;

interface CloneOptions extends InitOptions {
  forkResourceStore?: boolean;
}

interface ExistsFunction<TKeys extends string = string, TInterpolationMap extends object = $Dictionary> {
  (key: TKeys | TKeys[], options?: TOptions<TInterpolationMap>): boolean;
}

type ResourceKey =
  | string
  | {
      [key: string]: any;
    };

interface ResourceLanguage {
  [namespace: string]: ResourceKey;
}

interface Resource {
  [language: string]: ResourceLanguage;
}

declare class ResourceStore {
  constructor(data: Resource, options: InitOptions);

  public data: Resource;

  public options: InitOptions;

  on(event: 'added' | 'removed', callback: (lng: string, ns: string) => void): void;

  off(event: 'added' | 'removed', callback?: (lng: string, ns: string) => void): void;
}

type InferArrayValuesElseReturnType<T> = T extends Array<infer A> ? A : T;

type ModuleType = 'backend' | 'logger' | 'languageDetector' | 'postProcessor' | 'i18nFormat' | 'formatter' | '3rdParty';

interface Module {
  type: ModuleType;
}

interface Newable<T> {
  new (...args: any[]): T;
}

interface NewableModule<T extends Module> extends Newable<T> {
  type: T['type'];
}

interface Interpolator {
  init(options: InterpolationOptions, reset: boolean): undefined;
  reset(): undefined;
  resetRegExp(): undefined;
  interpolate(str: string, data: object, lng: string, options: InterpolationOptions): string;
  nest(str: string, fc: (...args: any[]) => any, options: InterpolationOptions): string;
}

interface Formatter {
  init(services: Services, i18nextOptions: InitOptions): void;
  add(name: string, fc: (value: any, lng: string | undefined, options: any) => string): void;
  addCached(name: string, fc: (lng: string | undefined, options: any) => (value: any) => string): void;
  format: FormatFunction;
}

interface Services {
  backendConnector: any;
  i18nFormat: any;
  interpolator: Interpolator;
  languageDetector: any;
  languageUtils: any;
  logger: any;
  pluralResolver: any;
  resourceStore: ResourceStore;
  formatter?: Formatter;
}

type CallbackError = Error | string | null | undefined;
type ReadCallback = (err: CallbackError, data: ResourceKey | boolean | null | undefined) => void;
type MultiReadCallback = (err: CallbackError, data: Resource | null | undefined) => void;

interface BackendModule<Options = object> extends Module {
  type: 'backend';
  init(services: Services, backendOptions: Options, i18nextOptions: InitOptions): void;
  read(language: string, namespace: string, callback: ReadCallback): void;
  create?(languages: readonly string[], namespace: string, key: string, fallbackValue: string): void;
  readMulti?(languages: readonly string[], namespaces: readonly string[], callback: MultiReadCallback): void;
  save?(language: string, namespace: string, data: ResourceLanguage): void;
}

interface LoggerModule extends Module {
  type: 'logger';
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

interface LanguageDetectorModule extends Module {
  type: 'languageDetector';
  init?(services: Services, detectorOptions: object, i18nextOptions: InitOptions): void;
  detect(): string | readonly string[] | undefined;
  cacheUserLanguage?(lng: string): void;
}

interface LanguageDetectorAsyncModule extends Module {
  type: 'languageDetector';
  async: true;
  init?(services: Services, detectorOptions: object, i18nextOptions: InitOptions): void;
  detect(
    callback: (lng: string | readonly string[] | undefined) => void | undefined
  ): void | Promise<string | readonly string[] | undefined>;
  cacheUserLanguage?(lng: string): void | Promise<void>;
}

interface I18nFormatModule extends Module {
  type: 'i18nFormat';
}

interface FormatterModule extends Module, Formatter {
  type: 'formatter';
}

interface ThirdPartyModule extends Module {
  type: '3rdParty';
  init(i18next: i18n): void;
}

interface Modules {
  backend?: BackendModule;
  logger?: LoggerModule;
  languageDetector?: LanguageDetectorModule | LanguageDetectorAsyncModule;
  i18nFormat?: I18nFormatModule;
  formatter?: FormatterModule;
  external: ThirdPartyModule[];
}

interface i18n extends CustomInstanceExtensions {
  t: TFunction<
    [
      ...$NormalizeIntoArray<DefaultNamespace>,
      ...Array<Exclude<FlatNamespace, InferArrayValuesElseReturnType<DefaultNamespace>>>,
    ]
  >;

  init(callback?: Callback): Promise<TFunction>;
  init<T>(options: InitOptions<T>, callback?: Callback): Promise<TFunction>;

  loadResources(callback?: (err: any) => void): void;

  use<T extends Module>(module: T | NewableModule<T> | Newable<T>): this;

  modules: Modules;

  services: Services;

  store: ResourceStore;

  exists: ExistsFunction;

  getDataByLanguage(lng: string): { [key: string]: { [key: string]: string } } | undefined;

  getFixedT<
    Ns extends Namespace | null = DefaultNamespace,
    TKPrefix extends KeyPrefix<ActualNs> = undefined,
    ActualNs extends Namespace = Ns extends null ? DefaultNamespace : Ns,
  >(
    ...args:
      | [lng: string | readonly string[], ns?: Ns, keyPrefix?: TKPrefix]
      | [lng: null, ns: Ns, keyPrefix?: TKPrefix]
  ): TFunction<ActualNs, TKPrefix>;

  changeLanguage(lng?: string, callback?: Callback): Promise<TFunction>;

  language: string;

  languages: readonly string[];

  resolvedLanguage?: string;

  hasLoadedNamespace(
    ns: string | readonly string[],
    options?: {
      lng?: string | readonly string[];
      fallbackLng?: InitOptions['fallbackLng'];
      precheck?: (
        i18n: i18n,
        loadNotPending: (lng: string | readonly string[], ns: string | readonly string[]) => boolean
      ) => boolean | undefined;
    }
  ): boolean;

  loadNamespaces(ns: string | readonly string[], callback?: Callback): Promise<void>;

  loadLanguages(lngs: string | readonly string[], callback?: Callback): Promise<void>;

  reloadResources(
    lngs?: string | readonly string[],
    ns?: string | readonly string[],
    callback?: () => void
  ): Promise<void>;
  reloadResources(lngs: null, ns: string | readonly string[], callback?: () => void): Promise<void>;

  setDefaultNamespace(ns: string | readonly string[]): void;

  dir(lng?: string): 'ltr' | 'rtl';

  format: FormatFunction;

  createInstance(options?: InitOptions, callback?: Callback): i18n;

  cloneInstance(options?: CloneOptions, callback?: Callback): i18n;

  on(event: 'initialized', callback: (options: InitOptions) => void): void;

  on(event: 'loaded', callback: (loaded: { [language: string]: { [namespace: string]: boolean } }) => void): void;

  on(event: 'failedLoading', callback: (lng: string, ns: string, msg: string) => void): void;

  on(
    event: 'missingKey',
    callback: (lngs: readonly string[], namespace: string, key: string, res: string) => void
  ): void;

  on(event: 'added' | 'removed', callback: (lng: string, ns: string) => void): void;

  on(event: string, listener: (...args: any[]) => void): void;

  off(event: string, listener?: (...args: any[]) => void): void;

  getResource(
    lng: string,
    ns: string,
    key: string,
    options?: Pick<InitOptions, 'keySeparator' | 'ignoreJSONStructure'>
  ): any;

  addResource(
    lng: string,
    ns: string,
    key: string,
    value: string,
    options?: { keySeparator?: string; silent?: boolean }
  ): i18n;

  addResources(lng: string, ns: string, resources: any): i18n;

  addResourceBundle(lng: string, ns: string, resources: any, deep?: boolean, overwrite?: boolean): i18n;

  hasResourceBundle(lng: string, ns: string): boolean;

  getResourceBundle(lng: string, ns: string): any;

  removeResourceBundle(lng: string, ns: string): i18n;

  options: InitOptions;

  isInitialized: boolean;

  isInitializing: boolean;

  initializedStoreOnce: boolean;

  initializedLanguageOnce: boolean;

  emit(eventName: string, ...args: any[]): void;
}

declare const i18next: i18n;

export type { i18n };

export { i18next };

export interface TFunction<Ns extends Namespace = DefaultNamespace, KPrefix = undefined>
  extends TFunctionSignature<Ns, KPrefix> {}

export declare function Trans<
  Key extends ParseKeys<Ns, TOpt, KPrefix>,
  Ns extends Namespace = _DefaultNamespace,
  KPrefix = undefined,
  TContext extends string | undefined = undefined,
  TOpt extends TOptions & { context?: TContext } = { context: TContext },
  E = React.HTMLProps<HTMLDivElement>,
>(props: TransProps<Key, Ns, KPrefix, TContext, TOpt, E>): React.ReactElement;
