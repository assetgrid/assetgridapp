import { DateTime } from "luxon";
import * as React from "react";
import { Period } from "../../models/period";
import PeriodSelector from "./PeriodSelector";

interface Props {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    period?: [Period, React.Dispatch<Period>];
    isDanger?: boolean;
}

export default function (props: Props): React.ReactElement {
    const [period, setPeriod] = props.period ?? [{ type: "month", start: DateTime.now() }, () => 0];

    return <section className="hero has-background-white" style={{ flexDirection: "row", alignItems: "center" }}>
        <div className="hero-body">
            <p className="title">
                {props.title}
            </p>
            {props.subtitle &&
                <p className={"subtitle" + (props.isDanger === true ? " has-text-danger" : " has-text-primary")}>
                    {props.subtitle}
                </p>}
        </div>
        {props.period && <div>
            <PeriodSelector period={period} onChange={setPeriod} />
        </div>}
    </section>;
}