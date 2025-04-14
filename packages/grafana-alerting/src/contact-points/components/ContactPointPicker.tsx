import { Combobox, ComboboxOption } from '@grafana/ui';

// @TODO move elsewhere
type ContactPointWithMetadata = {};

// do not export, use ComponentProps<ContactPointPicker>
interface ContactPointPickerProps {
  selectedContactPointUID?: string;
  onChange: (contactPoint: ContactPointWithMetadata) => void;
}

/**
 * Select a single contact point from a list of contact points for a given Alertmanager
 */
function ContactPointPicker({ selectedContactPointUID, onChange }: ContactPointPickerProps) {
  const isLoading = false;
  const error = null;

  const options: Array<ComboboxOption<string>> = [
    {
      label: 'Contact Point #1',
      value: 'cp1',
      description: 'Amazing contact point',
    },
    {
      label: 'Contact Point #2',
      value: 'cp2',
      description: 'Another amazing contact point',
    },
  ];

  const matchedContactPoint = selectContactPointByUID(options, selectedContactPointUID);

  // using the text value from the dropdown, find the contact point and return it to the consumer
  const handleChange = (selectedOption: ComboboxOption<string>) => {
    const selectedContactPoint = options.find((option) => option.value === selectedOption.label);
    if (selectedContactPoint) {
      onChange(selectedContactPoint);
    }
  };

  // @TODO a11y props?
  return (
    <Combobox<string>
      placeholder="Select a contact point"
      isClearable={true}
      options={options}
      onChange={handleChange}
      value={matchedContactPoint}
      loading={isLoading}
      disabled={isLoading}
      invalid={Boolean(error)}
    />
  );
}

function selectContactPointByUID(options: Array<ComboboxOption<string>>, uid?: string) {
  return options.find((option) => option.value === uid);
}

function contactPointsWithMetadataToComboboxOptions(
  contactPoints: ContactPointWithMetadata[]
): Array<ComboboxOption<string>> {
  return contactPoints.map((contactPoint) => ({
    label: contactPoint.name,
    value: contactPoint.uid,
    description: contactPoint.description,
  }));
}

export { ContactPointPicker };
