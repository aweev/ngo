/**
 * IATI (International Aid Transparency Initiative) v2.03 XML Generator
 *
 * Generates validated IATI Activity Standard XML manifests for institutional grant reporting
 * (EU Horizon, USAID, UN OCHA, Gates Foundation).
 */

export interface IATIActivityInput {
    id: string;
    iatiIdentifier: string;
    title: string;
    /** Omitted from the XML when the project has no real description. */
    description?: string | null;
    /** Omitted when the category has no mapped DAC sector code. */
    sectorCode?: string | null;
    sectorName?: string | null;
    // 1=Pipeline, 2=Implementation, 3=Finalisation, 4=Closed, 5=Cancelled
    statusCode: '1' | '2' | '3' | '4' | '5';
    startDate: string;
    endDate?: string | null;
    budgetAmount: number;
    currency: string;
    /** Real funders only — empty means the funding node is omitted. */
    funderNames?: string[];
}

export function escapeXml(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function generateIATIXml(orgName: string, orgIatiRef: string, activities: IATIActivityInput[]): string {
    const generatedAt = new Date().toISOString();

    const activityNodes = activities
        .map((act) => {
            const funderNodes = (act.funderNames ?? [])
                .filter((name) => name.trim().length > 0)
                .map(
                    (name) => `
      <participating-org role="1" type="10">
        <narrative>${escapeXml(name)}</narrative>
      </participating-org>`,
                )
                .join('');
            return `
    <iati-activity last-updated-datetime="${generatedAt}" default-currency="${escapeXml(act.currency)}">
      <iati-identifier>${escapeXml(act.iatiIdentifier)}</iati-identifier>
      <reporting-org ref="${escapeXml(orgIatiRef)}" type="22">
        <narrative>${escapeXml(orgName)}</narrative>
      </reporting-org>
      <title>
        <narrative>${escapeXml(act.title)}</narrative>
      </title>${act.description ? `
      <description type="1">
        <narrative>${escapeXml(act.description)}</narrative>
      </description>` : ''}
      <activity-status code="${escapeXml(act.statusCode)}" />
      <activity-date type="2" iso-date="${escapeXml(act.startDate)}" />${act.endDate ? `
      <activity-date type="3" iso-date="${escapeXml(act.endDate)}" />` : ''}
      <participating-org ref="${escapeXml(orgIatiRef)}" role="4" type="22">
        <narrative>${escapeXml(orgName)}</narrative>
      </participating-org>${funderNodes}${act.sectorCode ? `
      <sector vocabulary="1" code="${escapeXml(act.sectorCode)}">${act.sectorName ? `
        <narrative>${escapeXml(act.sectorName)}</narrative>` : ''}
      </sector>` : ''}
      <budget type="1" status="2">
        <period-start iso-date="${escapeXml(act.startDate)}" />
        <value currency="${escapeXml(act.currency)}" value-date="${escapeXml(act.startDate)}">${act.budgetAmount.toFixed(2)}</value>
      </budget>
    </iati-activity>`;
        })
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03" generated-datetime="${generatedAt}">
${activityNodes}
</iati-activities>`;
}
