using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class UserCsvImportProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;

        [MaxLength(50)]
        public string ProfileName { get; set; } = null!;
        public CsvImportProfile ImportProfile { get; set; } = null!;
    }

    public class CsvImportProfile : IValidatableObject
    {
        public const int Version = 1;

        // CSV Options
        public string CsvDelimiter { get; set; } = null!;
        public string CsvNewlineCharacter { get; set; } = null!;
        public string CsvParseHeader { get; set; } = null!;

        // Mapping options
        public string DuplicateHandling { get; set; } = null!;
        public string? IdentifierColumn { get; set; } = null!;
        public ParseOptions IdentifierParseOptions { get; set; } = null!;
        public string SourceAccountColumn { get; set; } = null!;
        public string SourceAccount { get; set; } = null!;
        public string SourceAccountIdentifier { get; set; } = null!;
        public ParseOptions SourceAccountParseOptions { get; set; } = null!;
        public string DestinationAccountColumn { get; set; } = null!;
        public string DestinationAccount { get; set; } = null!;
        public string DestinationAccountIdentifier { get; set; } = null!;
        public ParseOptions DestinationAccountParseOptions { get; set; } = null!;
        public string AmountColumn { get; set; } = null!;
        public ParseOptions AmountParseOptions { get; set; } = null!;
        public string DecimalSeparator { get; set; } = null!;
        public string DateColumn { get; set; } = null!;
        public ParseOptions DateParseOptions { get; set; } = null!;
        public string DateFormat { get; set; } = null!;
        public string DescriptionColum { get; set; } = null!;
        public ParseOptions DescriptionParseOptions { get; set; } = null!;
        public string CategoryColumn { get; set; } = null!;
        public ParseOptions CategoryParseOptions { get; set; } = null!;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            switch (DuplicateHandling)
            {
                case "automatic":
                case "none":
                    break;
                case "identifier":
                    if (string.IsNullOrWhiteSpace(IdentifierColumn))
                    {
                        yield return new ValidationResult($"Identifier column must be set with duplicate handling 'identifier'.", new[] { nameof(IdentifierColumn) });
                    }
                    break;
                default:
                    yield return new ValidationResult($"Unknown duplicate handling '{DuplicateHandling}'", new[] { nameof(DuplicateHandling) });
                    break;
            }
        }

        public class ParseOptions
        {
            public bool TrimWhitespace { get; set; }
            public string Regex { get; set; } = null!;
            public string Pattern { get; set; } = null!;
        }
    }
}
