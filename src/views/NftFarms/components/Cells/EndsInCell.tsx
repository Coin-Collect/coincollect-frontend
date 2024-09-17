import { Flex, Text, TimerIcon, useTooltip } from "@pancakeswap/uikit";
import { useTranslation } from "contexts/Localization";
import { useMemo } from "react";
import getTimePeriods from "utils/getTimePeriods";


interface EndTimeTooltipComponentProps {
  endTime: number;
}

export const EndTimeTooltipComponent: React.FC<React.PropsWithChildren<EndTimeTooltipComponentProps>> = ({
  endTime,
}) => {
  const {
    t,
    currentLanguage: { locale },
  } = useTranslation();

  return (
    <>
      <Text bold>{t("End Time")}:</Text>
      <Text>
        {new Date(endTime * 1000).toLocaleString(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </Text>
    </>
  );
};

export function TimeCountdownDisplay({
  timestamp = 0,
  getNow = () => Date.now(),
}: {
  timestamp?: number;
  getNow?: () => number;
}) {
  const { t } = useTranslation();

  const currentDate = getNow() / 1000;
  const poolTimeRemaining = Math.abs(timestamp - currentDate);
  const endTimeObject = useMemo(() => getTimePeriods(poolTimeRemaining), [poolTimeRemaining]);

  const {
    targetRef: endTimeTargetRef,
    tooltip: endTimeTooltip,
    tooltipVisible: endTimeTooltipVisible,
  } = useTooltip(<EndTimeTooltipComponent endTime={timestamp} />, {
    placement: "top",
  });

  if (!timestamp) return null;

  return (
    <Flex alignItems="center">
      <Text color="textSubtle" small>
        {poolTimeRemaining > 0
          ? endTimeObject?.totalDays
            ? endTimeObject?.totalDays === 1
              ? t("1 day")
              : t("%days% days", { days: endTimeObject?.totalDays })
            : t("< 1 day")
          : t("%days% days", { days: 0 })}
      </Text>
      <span ref={endTimeTargetRef}>
        <TimerIcon ml="4px" color="primary" />
        {endTimeTooltipVisible && endTimeTooltip}
      </span>
    </Flex>
  );
}

