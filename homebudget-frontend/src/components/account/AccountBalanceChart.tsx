import * as React from "react";
import { LineChart, Line } from "recharts";
import { GetMovementResponse } from "../../models/account";

interface Props {
    id: number;
}

interface State {
    data: GetMovementResponse | "fetching";
}

export default class AccountBalanceChart extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            data: "fetching",
        };
    }

    public render() {
        if (this.state.data === "fetching") {
            return <>Please wait&hellip;</>;
        }

        return <div>
            {/*<LineChart data={this.state.data.items} width={20} height={300}>
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
    </LineChart> */ }
        </div>;
    }
}