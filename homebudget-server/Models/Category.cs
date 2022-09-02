namespace homebudget_server.Models
{
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string NormalizedName { get; set; } = null!;

        public static string Normalize (string name)
        {
            return name.Trim().ToLower();
        }
    }
}
