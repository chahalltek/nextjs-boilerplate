// app/api/lineup-lab/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs"; // required for Buffer base64

type Body = {
  email: string;
  teamName?: string;
  sendWeekly?: boolean;
  rules: {
    qb: number; rb: number; wr: number; te: number; flex: number; dst: number; k: number;
    scoring: "PPR" | "HALF_PPR" | "STD";
  };
  players: Array<{ id: string; name: string; team: string; pos: string; isFlex?: boolean }>;
};

function csvForRoster(teamName: string, rules: Body["rules"], players: Body["players"]) {
  const headers = ["Slot", "Player", "Team", "Pos"];
  const rows = players.map(p => [p.isFlex ? "FLEX" : "", p.name, p.team, p.pos]);
  const all = [headers, ...rows];
  return all.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function htmlForRoster(teamName: string, rules: Body["rules"], players: Body["players"]) {
  return `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
      <h1 style="margin:0 0 8px">${teamName || "Your Roster"}</h1>
      <p style="margin:0 0 16px;color:#555">
        Scoring: <strong>${rules.scoring}</strong> · Slots — QB:${rules.qb}, RB:${rules.rb}, WR:${rules.wr}, TE:${rules.te}, FLEX:${rules.flex}, DST:${rules.dst}, K:${rules.k}
      </p>
      <table style="border-collapse:collapse;width:100%">
        <thead><tr>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">Slot</th>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">Player</th>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">Team</th>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">Pos</th>
        </tr></thead>
        <tbody>
          ${players.map(p => `
            <tr>
              <td style="border-bottom:1px solid #eee;padding:8px">${p.isFlex ? "FLEX" : ""}</td>
              <td style="border-bottom:1px solid #eee;padding:8px">${p.name}</td>
              <td style="border-bottom:1px solid #eee;padding:8px">${p.team}</td>
              <td style="border-bottom:1px solid #eee;padding:8px">${p.pos}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { email, teamName = "Roster", rules, players } = body || {};

    if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    if (!players?.length) return NextResponse.json({ ok: false, error: "No players selected" }, { status: 400 });

    // Clear diagnostics if env is missing
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const csv = csvForRoster(teamName, rules, players);

    const { error } = await resend.emails.send({
      from: "Hey Skol Sister <hello@heyskolsister.com>", // Must be verified in Resend
      to: email,
      subject: `Your lineup — ${teamName}`,
      replyTo: "hello@heyskolsister.com",
      text: `Your lineup is attached as CSV.\n\n${players.map(p => `• ${p.name} (${p.team}) ${p.pos}${p.isFlex ? " [FLEX]" : ""}`).join("\n")}\n`,
      html: htmlForRoster(teamName, rules, players),
      attachments: [
        { filename: `${teamName.replace(/\s+/g, "-").toLowerCase()}-roster.csv`, content: Buffer.from(csv).toString("base64") },
      ],
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message || "Email send failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Bad Request" }, { status: 400 });
  }
}
