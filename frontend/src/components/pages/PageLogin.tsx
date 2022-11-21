import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import * as Api from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { forget } from "../../lib/Utils";
import { User } from "../../models/user";
import Card from "../common/Card";
import InputText from "../input/InputText";

export default function PageLogin (): React.ReactElement {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [state, setState] = React.useState<"signing-in" | "waiting" | "error">("waiting");
    const navigate = useNavigate();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    React.useEffect(() => {
        Api.anyUsers().then(result => {
            if (result.status === 200 && !result.data) {
                navigate(routes.signup());
            }
        }).catch(null);
    }, []);

    return <section className="page-login">
        <Card title={t("login.sign_in_to_assetgrid")!} isNarrow={true}>
            <form>
                <InputText
                    value={email}
                    label={t("user.email")!}
                    disabled={state === "signing-in"}
                    onChange={e => setEmail(e.target.value)} errors={state === "error"} />
                <InputText
                    value={password}
                    password={true}
                    label={t("user.password")!}
                    disabled={state === "signing-in"}
                    onChange={e => setPassword(e.target.value)} errors={state === "error" ? [t("user.invalid_username_or_password")] : undefined} />
                <input
                    type="submit"
                    className="button is-primary"
                    disabled={state === "signing-in"}
                    onClick={forget(signIn)!}
                    value={t("user.sign_in")!}
                />
            </form>
        </Card>
    </section>;

    async function signIn (): Promise<void> {
        setState("signing-in");
        const result = await Api.authenticate(email, password);
        setPassword("");
        if (result.status === 200) {
            setState("waiting");
            queryClient.setQueryData<User>(["user"], old => result.data);
            navigate(routes.dashboard());
        } else {
            setState("error");
        }
    }
}
