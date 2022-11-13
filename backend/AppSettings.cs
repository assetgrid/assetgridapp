namespace assetgrid_backend
{
    public class AppSettings
    {
        
    }

    public class JwtSecret
    {
        public JwtSecret(string value)
        {
            Value = value;
        }

        public string Value { get; set; }

        public static JwtSecret Get(string? savePath = null)
        {
            var bytes = new byte[256];
            var secretRead = false;
            if (savePath != null && File.Exists(savePath))
            {
                using (var reader = File.OpenRead(savePath))
                {
                    if (reader.Length == bytes.Length)
                    {
                        reader.Read(bytes, 0, bytes.Length);
                        secretRead = true;
                    }
                }
            }

            if (! secretRead)
            {
                new Random().NextBytes(bytes);

                if (savePath != null)
                {
                    File.WriteAllBytes(savePath, bytes);
                }
            }

            var secret = System.Convert.ToBase64String(bytes);
            return new JwtSecret(secret);
        }
    }
}