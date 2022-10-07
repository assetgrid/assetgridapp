import { DateTime } from "luxon";
import * as React from "react";
import { Period } from "../../models/period";
import PeriodSelector from "./PeriodSelector";

interface Props {
    title: React.ReactNode
    subtitle?: React.ReactNode
    period?: [Period, React.Dispatch<Period>]
    isDanger?: boolean
}

export default function Hero (props: Props): React.ReactElement {
    const [period, setPeriod] = props.period ?? [{ type: "month", start: DateTime.now() }, () => 0];

    return <section className="hero has-background-white">
        <div className="hero-body" style={{ flexDirection: "row", alignItems: "center", display: "flex", flexWrap: "wrap" }}>
            <div className="hero-left" style={{ flex: 1, minWidth: "20rem", marginBottom: "1rem" }}>
                <p className="title">
                    {props.title}
                </p>
                {props.subtitle !== undefined && <p className={"subtitle" + (props.isDanger === true ? " has-text-danger" : " has-text-primary")}>
                    {props.subtitle}
                </p>}
            </div>
            {(props.period != null) && <div>
                <PeriodSelector period={period} onChange={setPeriod} />
            </div>}
        </div>
    </section>;
}
