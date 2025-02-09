// Copyright 2021 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package config

import (
	"github.com/perses/common/config"
)

type Config struct {
	Database Database `yaml:"database"`
}

func Resolve(configFile string, dbFolder string, dbExtension string) (Config, error) {
	c := Config{}
	if len(dbFolder) > 0 {
		c.Database.File = &File{
			Folder:        dbFolder,
			FileExtension: FileExtension(dbExtension),
		}
	}
	return c, config.NewResolver().
		SetConfigFile(configFile).
		SetEnvPrefix("PERSES").
		Resolve(&c).
		Verify()
}
