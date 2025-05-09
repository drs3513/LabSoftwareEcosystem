import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "filestorage142024",
    isDefault: true,
  access: (allow) => ({
    "uploads/*": [allow.authenticated.to(["list", "write", "delete","get"]), allow.groups(["USER", "ADMINISTRATOR"]).to(["list", "write", "delete", "get"])], // Correct syntax
  }),
  versioned: true
});

/*
export const openSearchStorage = defineStorage(
    {name: "opensearch-backup-bucket-amplify-gen-2",
      access: allow => ({
        'public/*': [
          allow.authenticated.to(['list', 'write', 'get'])
        ]
      })
    }
    );



 */
