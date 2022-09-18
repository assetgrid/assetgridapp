import * as React from "react";
import { Card } from "../../common/Card";
import InputButton from "../../input/InputButton";
import CreateTransaction from "../../transaction/CreateTransaction";

export default function () {
    return <>
        <section className="hero has-background-info" style={{ flexDirection: "row", alignItems: "center" }}>
            <div className="hero-body">
                <p className="title has-text-white">
                    Create new account
                </p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Create transaction">
                <CreateTransaction />

                <div className="buttons">
                    <InputButton onClick={() => 0}>Create and Continue</InputButton>
                    <InputButton onClick={() => 0}>Create and View Transaction</InputButton>
                </div>
            </Card>
        </div>
    </>;
}
