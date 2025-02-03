import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    sectionPadding: css({
      padding: '20px',
    }),
    header: css({
      display: 'flex',

      button: {
        marginLeft: 'auto',
      },
    }),
    iconSection: css({
      padding: '0 0 10px 0',
      color: `${theme.colors.text.secondary}`,

      img: {
        paddingRight: '4px',
      },
    }),
    rightButtonsWrapper: css({
      display: 'flex',
    }),
    rightButtons: css({
      marginLeft: 'auto',
    }),
    leftButton: css({
      marginRight: '10px',
    }),
    dataList: css({
      padding: '0px 28px 0px 28px',
    }),
    textPadding: css({
      paddingBottom: '12px',
    }),
    containerPadding: css({
      padding: '28px',
    }),
    infoContainer: css({
      border: `${theme.colors.border.strong}`,
      padding: '16px',
      backgroundColor: `${theme.colors.background.secondary}`,
      borderRadius: `8px`,
      borderBottomLeftRadius: 0,
    }),
    infoContainerWrapper: css({
      paddingBottom: '24px',
    }),
    metricTable: css({
      width: '100%',
    }),
    metricTableName: css({
      width: '15%',
    }),
    metricTableValue: css({
      fontFamily: `${theme.typography.fontFamilyMonospace}`,
      fontSize: `${theme.typography.bodySmall.fontSize}`,
      overflow: 'scroll',
      textWrap: 'nowrap',
      maxWidth: '150px',
      width: '60%',
      maskImage: `linear-gradient(to right, rgba(0, 0, 0, 1) 90%, rgba(0, 0, 0, 0))`,
    }),
    metricTableButton: css({
      float: 'right',
    }),
    queryQuestion: css({
      textAlign: 'end',
      padding: '8px 0',
    }),
    secondaryText: css({
      color: `${theme.colors.text.secondary}`,
    }),
    loadingMessageContainer: css({
      border: `${theme.colors.border.strong}`,
      padding: `16px`,
      backgroundColor: `${theme.colors.background.secondary}`,
      marginBottom: `20px`,
      borderRadius: `8px`,
      color: `${theme.colors.text.secondary}`,
      fontStyle: 'italic',
    }),
    floatRight: css({
      float: 'right',
    }),
    codeText: css({
      fontFamily: `${theme.typography.fontFamilyMonospace}`,
      fontSize: `${theme.typography.bodySmall.fontSize}`,
    }),
    bodySmall: css({
      fontSize: `${theme.typography.bodySmall.fontSize}`,
    }),
    explainPadding: css({
      paddingLeft: '26px',
    }),
    bottomMargin: css({
      marginBottom: '20px',
    }),
    topPadding: css({
      paddingTop: '22px',
    }),
    doc: css({
      textDecoration: 'underline',
    }),
    afterButtons: css({
      display: 'flex',
      justifyContent: 'flex-end',
    }),
    feedbackStyle: css({
      margin: 0,
      textAlign: 'right',
      paddingTop: '22px',
      paddingBottom: '22px',
    }),
    nextInteractionHeight: css({
      height: '88px',
    }),
    center: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    inputPadding: css({
      paddingBottom: '24px',
    }),
    querySuggestion: css({
      display: 'flex',
      flexWrap: 'nowrap',
    }),
    longCode: css({
      width: '90%',
      textWrap: 'nowrap',
      overflow: 'scroll',
      maskImage: `linear-gradient(to right, rgba(0, 0, 0, 1) 90%, rgba(0, 0, 0, 0))`,

      div: {
        display: 'inline-block',
      },
    }),
    useButton: css({
      marginLeft: 'auto',
    }),
    suggestionFeedback: css({
      textAlign: 'left',
    }),
    feedbackQuestion: css({
      display: 'flex',
      padding: '8px 0px',
      h6: { marginBottom: 0 },
      i: {
        marginTop: '1px',
      },
    }),
    explationTextInput: css({
      paddingLeft: '24px',
    }),
    submitFeedback: css({
      padding: '16px 0',
    }),
    noMargin: css({
      margin: 0,
    }),
    enableButtonTooltip: css({
      padding: 8,
    }),
    enableButtonTooltipText: css({
      color: `${theme.colors.text.secondary}`,
      ul: {
        marginLeft: 16,
      },
    }),
    link: css({
      color: `${theme.colors.text.link} !important`,
    }),
  };
};
