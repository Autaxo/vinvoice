import { Base } from '../layouts/base.mjs';
import { PageHead } from '../components/page-head.mjs';
import { html } from '../lib/html.mjs';

export function render({ path }) {
  return Base(
    {
      path,
      title: 'Datenschutzerklärung',
      description:
        'Datenschutzerklärung für vinvoice.org: keine Cookies, kein Tracking, keine Inhalte von Drittanbietern. Hosting über GitHub Pages.',
      lang: 'de',
    },
    html`
  ${PageHead(
    { title: 'Datenschutzerklärung', lead: 'Für die Website vinvoice.org' },
    html`
    <p class="small muted" lang="en">
      Privacy notice, in German. In short: no cookies, no tracking, no third-party content. The
      hosting provider, GitHub Pages, keeps server logs.
    </p>
  `
  )}

  <div class="prose">
    <h2>Kurz gesagt</h2>
    <ul>
      <li>
        Diese Website setzt <strong>keine Cookies</strong> und speichert nichts in Ihrem Browser.
      </li>
      <li>
        Wir verwenden <strong>keine Analyse-, Tracking- oder Marketingdienste</strong> und keine Einwilligungsabfrage,
        weil es nichts gibt, in das Sie einwilligen müssten.
      </li>
      <li>
        Die Website lädt <strong>keine Inhalte von Dritten</strong>: keine externen Schriftarten,
        Skripte, Content-Delivery-Netzwerke oder eingebetteten Medien. Alle Dateien kommen von
        vinvoice.org.
      </li>
      <li>
        Beim Aufruf entstehen technisch notwendige <strong>Server-Logs</strong> beim Hosting-Anbieter
        (siehe unten).
      </li>
    </ul>

    <h2>Verantwortlicher</h2>
    <p>Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO ist:</p>
    <p>
      <strong>Autaxo GmbH</strong><br />
      c/o Julian Alessio Goßen<br />
      Kiefernstraße 25<br />
      45525 Hattingen<br />
      Deutschland
    </p>
    <p>
      Vertreten durch: Julian Alessio Goßen<br />
      Handelsregister: Amtsgericht Essen, HRB 36889<br />
      E-Mail: <a href="mailto:kontakt@autaxo.de">kontakt@autaxo.de</a>
    </p>
    <p>
      Datenschutzanfragen richten Sie bitte an <a href="mailto:datenschutz@autaxo.de">datenschutz@autaxo.de</a>.
    </p>

    <h2>Hosting, Auslieferung und Server-Logs</h2>
    <p>
      Diese Website wird über <strong>GitHub Pages</strong> ausgeliefert, einen Dienst der GitHub, Inc.,
      88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA (ein Unternehmen der Microsoft Corporation).
      Bei jedem Aufruf verarbeitet GitHub technisch notwendige Daten, um die Seiten auszuliefern und den
      Dienst abzusichern; dabei wird insbesondere die IP-Adresse protokolliert.
    </p>
    <ul>
      <li>
        <strong>Verarbeitete Daten:</strong> IP-Adresse, Datum und Uhrzeit, aufgerufene URL, Referrer,
        HTTP-Header, User-Agent, übertragene Datenmenge, Fehler- und Sicherheitslogs.
      </li>
      <li>
        <strong>Zweck:</strong> Auslieferung der Website, Systemsicherheit, Missbrauchsabwehr, Fehleranalyse
        und Verfügbarkeit.
      </li>
      <li>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt
        im sicheren und zuverlässigen Betrieb der Website.
      </li>
      <li>
        <strong>Speicherdauer:</strong> nach den Vorgaben von GitHub; wir selbst erhalten und speichern
        diese Logdaten nicht.
      </li>
    </ul>
    <p>
      Wir werten keine Zugriffsdaten zur Reichweitenmessung aus. Näheres zur Verarbeitung durch
      GitHub steht im <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">GitHub General Privacy Statement</a>.
    </p>

    <h2>Drittlandübermittlungen</h2>
    <p>
      GitHub verarbeitet die Daten auch in den USA. GitHub ist nach dem EU-US Data Privacy Framework
      zertifiziert; der Angemessenheitsbeschluss der Europäischen Kommission ist Grundlage der
      Übermittlung. Ergänzend verwendet GitHub die EU-Standardvertragsklauseln.
    </p>

    <h2>Beiträge über GitHub</h2>
    <p>
      Vorschläge, Fehlermeldungen und Änderungen zu VINvoice werden öffentlich im Repository auf
      GitHub eingereicht und diskutiert. Dafür ist ein GitHub-Konto nötig, und es gelten die
      Bedingungen und die Datenschutzerklärung von GitHub. Beiträge sind mit Ihrem GitHub-Namen
      öffentlich sichtbar und bleiben Teil der Versionsgeschichte. Rechtsgrundlage für unsere
      Bearbeitung ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der offenen,
      nachvollziehbaren Pflege des Standards.
    </p>

    <h2>Kontakt per E-Mail</h2>
    <p>
      Wenn Sie uns eine E-Mail schreiben, etwa mit einem Vorschlag für einen Schlüssel oder für die
      Liste der Implementierungen, verarbeiten wir Ihre Angaben, um Ihre Anfrage zu bearbeiten.
      Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, bei vertragsbezogenen Anfragen Art. 6 Abs. 1
      lit. b DSGVO. Für E-Mail nutzen wir Google Workspace (Google Ireland Ltd.). Wir löschen die
      Daten, sobald die Anfrage abschließend bearbeitet ist und keine gesetzlichen
      Aufbewahrungspflichten entgegenstehen. Wenn Sie der Aufnahme in die öffentliche Liste der
      Implementierungen zustimmen, veröffentlichen wir dort nur die Angaben zur Software und zur
      Organisation.
    </p>

    <h2>Links zu anderen Websites</h2>
    <p>
      Diese Website verlinkt auf andere Websites, zum Beispiel auf Rechtstexte oder auf die Website
      des Förderers. Dabei werden keine Daten übertragen, bevor Sie einen Link anklicken. Für die
      verlinkten Websites gelten die Datenschutzerklärungen ihrer Betreiber.
    </p>

    <h2>Ihre Rechte</h2>
    <p>Sie haben nach Maßgabe der gesetzlichen Voraussetzungen folgende Rechte:</p>
    <ul>
      <li>Auskunft nach Art. 15 DSGVO</li>
      <li>Berichtigung nach Art. 16 DSGVO</li>
      <li>Löschung nach Art. 17 DSGVO</li>
      <li>Einschränkung der Verarbeitung nach Art. 18 DSGVO</li>
      <li>Datenübertragbarkeit nach Art. 20 DSGVO</li>
      <li>
        Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO nach Art. 21
        DSGVO
      </li>
    </ul>
    <p>
      Zur Ausübung Ihrer Rechte genügt eine E-Mail an <a href="mailto:datenschutz@autaxo.de">datenschutz@autaxo.de</a>. Sie haben außerdem das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde,
      insbesondere bei der für uns zuständigen Landesbeauftragten für Datenschutz und
      Informationsfreiheit Nordrhein-Westfalen.
    </p>
    <p>
      Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO
      findet nicht statt.
    </p>

    <h2>Änderungen</h2>
    <p>
      Wir passen diese Datenschutzerklärung an, wenn sich die Website, der Hosting-Anbieter oder die
      Rechtslage ändern.
    </p>
    <p><strong>Stand:</strong> 24.10.2026</p>
  </div>
`
  );
}
