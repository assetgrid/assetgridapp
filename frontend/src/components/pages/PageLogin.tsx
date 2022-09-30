import * as React from "react";
import { useNavigate } from "react-router";
import * as Api from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { userContext } from "../App";
import Card from "../common/Card";
import InputButton from "../input/InputButton";
import InputText from "../input/InputText";

export default function (): React.ReactElement {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [state, setState] = React.useState<"signing-in" | "waiting" | "error">("waiting");
    const { setUser } = React.useContext(userContext);
    const navigate = useNavigate();

    React.useEffect(() => {
        Api.anyUsers().then(anyUsers => {
            if (!anyUsers) {
                navigate(routes.signup());
            }
        });
    }, []);

    return <section className="page-login">
        <Card title="Sign in to Assetgrid" isNarrow={true}>
            <InputText value={email} label="Email" onChange={e => setEmail(e.target.value)} error={state === "error"} />
            <InputText value={password} password={true} label="Password" onChange={e => setPassword(e.target.value)} errors={state === "error" ? ["Invalid username or password"] : undefined} />
            <InputButton className="is-primary" onClick={signIn}>
                Sign in
            </InputButton>
        </Card>
    </section>;

    async function signIn() {
        setState("signing-in");
        let result = await Api.authenticate(email, password);
        setPassword("");
        if (result === null) {
            setState("error");
        } else {
            setState("waiting");
            setUser(result);
            navigate(routes.dashboard());
        }
    }
}