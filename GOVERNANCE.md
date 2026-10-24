# Governance

The rules for VINvoice (neutrality charter, change process, how to propose a key, licences) are
published at <https://vinvoice.org/governance/>. Their source is
[`site/pages/governance.astro`](site/pages/governance.astro); change them there, by pull request,
under the same rules.

In short:

- At least three editors from at least two organisations; no organisation holds more than a third
  of the votes; the sponsor holds at most one seat and no veto.
- Free to implement, no fees, no certification; funding is disclosed.
- No vendor-specific keys; vendor data uses the reserved `x.<vendor>.` segment after the prefix.
- A key needs two independent organisations that will write or read it; the core tier needs three
  implementers per key and holds at most 15 keys (`npm run validate` enforces the cap).
- Lazy consensus on public issues: 14 days, 28 days for the core tier.
- Within 12 months after 1.0, repository, identifier path, domain and name move to a neutral
  steward.
